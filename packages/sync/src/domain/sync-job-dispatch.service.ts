import { MAX_REFRESH_FAILED_ATTEMPTS } from "@sync/credentials/refresh-failure.constants";
import { importCalendarEvents } from "@sync/domain/calendar-import.service";
import { syncCalendarList } from "@sync/domain/calendar-list-sync.service";
import { pullCalendarChanges } from "@sync/domain/calendar-pull.service";
import { repairCalendar } from "@sync/domain/calendar-repair.service";
import { refreshConnectionStateAfterJob } from "@sync/domain/connection-state-refresh.service";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
import { maintainSubscription } from "@sync/domain/subscription-maintenance.service";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import {
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";
import {
  ProviderEventReadError,
  type ProviderEventReader,
} from "@sync/providers/provider-event-reader.port";
import { type ProviderNotificationAdapter } from "@sync/providers/provider-notifications.port";
import {
  type JobEnqueue,
  type JobRecord,
  resourceJob,
} from "@sync/storage/contracts/job.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface SyncJobDispatchDeps {
  events: EventRepository;
  occurrences: EventOccurrenceRepository;
  resources: SyncResourceRepository;
  calendars: ProviderCalendarRepository;
  // syncCalendarList resolves the connection a calendarListSync job targets,
  // discovers its calendars, and enqueues an initial import per active calendar.
  connections: ProviderConnectionRepository;
  credentials: CredentialRepository;
  discovery: ProviderCalendarAdapter;
  jobs: JobRepository;
  // pullCalendarChanges consults pending commands before deleting an event.
  commands: CommandRepository;
  reader: ProviderEventReader;
  custody: AccessTokenSource;
  // maintainSubscription opens/renews the calendar's push channel; the callback
  // url is where the provider posts change notifications back to this service.
  notifications: ProviderNotificationAdapter;
  callbackUrl: string;
  // Content-free outbox so Compass API can push typed browser SSE after a
  // provider pull. Without this, incremental pulls update Sync storage but the
  // open SPA never refetches (S40 gap).
  invalidations: InvalidationRepository;
  // Optional: a bootstrap/repair job settling "done" is otherwise invisible
  // (drops and errors are logged; "done" is not) - an hour of a resource
  // repairing every ~2 minutes produced zero log lines (2026-08-04 staging).
  // Defaults to a no-op so tests stay dependency-free. `info` is optional on
  // top of that so existing callers passing only `warn` keep type-checking.
  log?: {
    warn: (message: string) => void;
    info?: (message: string) => void;
  };
}

// The decision a dispatch makes about a claimed job. The worker loop (a later
// slice) owns the lease and turns this into a JobRepository call; keeping the
// decision pure keeps dispatch trivially testable without a queue.
export type SyncJobOutcome =
  // The work is done; settle the job complete. `followup`, when present, is a
  // new job to enqueue (coalesced) — e.g. an expired pull hands off to a repair.
  | { readonly result: "done"; readonly followup?: JobEnqueue }
  // A transient, self-correcting condition; return the job to pending to retry.
  | { readonly result: "retry"; readonly reason: string }
  // Nothing to act on — the job's target vanished (resource/calendar deleted) or
  // the job is malformed for its kind. Settle complete; retrying can't help.
  | { readonly result: "drop"; readonly reason: string };

// Run one claimed sync job (calendarListSync / initialImport / incrementalPull /
// repair / subscriptionMaintain) and report how to settle it. calendarListSync
// resolves the job's CONNECTION; the rest resolve its resource and calendar. A
// job whose target no longer exists is dropped rather than retried forever. All
// reads/writes inside the called services are owner-scoped.
export async function dispatchSyncJob(
  deps: SyncJobDispatchDeps,
  job: JobRecord,
  now: () => Date,
): Promise<SyncJobOutcome> {
  try {
    return await runSyncJob(deps, job, now);
  } catch (error) {
    // Every kind resolves its provider token through getValidAccessToken, so a
    // dead credential surfaces here whichever engine ran. Settle it done: the
    // worker's generic catch classes any throw as retryableTransient, which
    // would burn the whole retry ladder on a grant only a reconnect can fix.
    // Done rather than a permanent failure because a failed job keeps its
    // coalescing key and enqueue only $setOnInsert's, so the dead row would
    // swallow the reconnect's re-enqueue and sync would never restart.
    // refreshFailed rethrows: that is the transient case, a blip refreshing a
    // still-good token. Mirrors the write path in provider-command.service.ts.
    if (
      error instanceof ProviderAuthError &&
      error.reason !== "refreshFailed"
    ) {
      // Belt and braces: custody already discards on authorizationRevoked.
      await deps.custody.discardRevoked(job.connectionId);
      await refreshConnectionStateAfterJob(deps, job, now);
      return {
        result: "drop",
        reason: `credential unusable (${error.reason}) for connection ${job.connectionId}; sync resumes on reconnect`,
      };
    }

    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      const credential = await deps.credentials.findByConnection(
        job.connectionId,
      );
      const expired =
        (credential?.refreshFailureCount ?? 0) >= MAX_REFRESH_FAILED_ATTEMPTS;
      if (expired || job.attempt >= MAX_REFRESH_FAILED_ATTEMPTS) {
        await refreshConnectionStateAfterJob(deps, job, now);
        return {
          result: "drop",
          reason: `token refresh failed ${job.attempt} time(s) for connection ${job.connectionId}; reconnect or retry from the app`,
        };
      }
      throw error;
    }

    // The provider rejected the cached access token (401). Event reads
    // (pull/import/repair) remint in-process via listEventPageWithAuthRetry;
    // calendar-list discovery remints via discoverCalendarsWithAuthRetry;
    // this fallback covers any path that still throws authExpired. Invalidate
    // so the worker retry mints a fresh token instead of replaying the same
    // rejected one. If the refresh then fails with authorizationRevoked, that
    // surfaces as ProviderAuthError on the next attempt and is handled above.
    if (
      (error instanceof ProviderEventReadError &&
        error.reason === "authExpired") ||
      (error instanceof ProviderCalendarError && error.reason === "authExpired")
    ) {
      await deps.custody.invalidateAccessToken(job.connectionId);
      throw error;
    }

    // A DURABLE read rejection: Google answered with a 4xx that is not 410
    // (cursor expired) or 429 (rate limited) — a calendar deleted out from under
    // us, access revoked for it, or a permanently rejected id. Retrying cannot
    // fix it, and treating it as retryableTransient burned all 20 attempts and
    // wedged the job in state:"failed" (2026-07-30: 3 such jobs in prod).
    //
    // Settle it as a DROP, not failureClass:"permanent", for the same reason the
    // credential path above does: a failed job keeps its coalescing key and
    // enqueue only $setOnInsert's, so a permanent row would swallow the
    // re-enqueue after the calendar is reconnected or re-shared and sync would
    // never restart. Dropping frees the key.
    //
    // Dropping also erases the only evidence the job row carried, so stamp the
    // resource first — that marker is what connection health reads, so a dead
    // primary calendar stops reporting healthy.
    if (
      error instanceof ProviderEventReadError &&
      error.reason === "readFailed"
    ) {
      const detail =
        error.cause instanceof Error ? error.cause.message : error.message;
      if (job.resourceId) {
        await deps.resources.markReadFailure(
          job.tenantId,
          job.principalId,
          job.resourceId,
          now(),
          detail,
        );
      }
      await refreshConnectionStateAfterJob(deps, job, now);
      return {
        result: "drop",
        reason: `provider durably rejected reads for resource ${job.resourceId} (${detail}); sync resumes once the calendar is readable again`,
      };
    }

    // Durable calendar-list discovery refusal (e.g. notACalendarUser). Same
    // drop-not-fail rationale as readFailed above. calendarListSync jobs carry
    // resourceId: null, so resolve the connection's calendarList resource for
    // the health marker — syncCalendarList ensured it before discovery threw.
    if (
      error instanceof ProviderCalendarError &&
      error.reason === "discoveryFailed"
    ) {
      const detail =
        error.cause instanceof Error ? error.cause.message : error.message;
      const calendarList = (
        await deps.resources.listByConnection(
          job.tenantId,
          job.principalId,
          job.connectionId,
        )
      ).find((resource) => resource.resourceKind === "calendarList");
      if (calendarList) {
        await deps.resources.markReadFailure(
          job.tenantId,
          job.principalId,
          calendarList._id,
          now(),
          detail,
        );
      }
      await refreshConnectionStateAfterJob(deps, job, now);
      return {
        result: "drop",
        reason: `provider durably rejected calendar-list discovery for connection ${job.connectionId} (${detail}); sync resumes once the account can list calendars again`,
      };
    }
    throw error;
  }
}

async function runSyncJob(
  deps: SyncJobDispatchDeps,
  job: JobRecord,
  now: () => Date,
): Promise<SyncJobOutcome> {
  // Calendar-list discovery is keyed on the connection, not a calendar/resource,
  // so it is resolved and handled before the resource-based family below.
  if (job.kind === "calendarListSync") {
    const connection = await deps.connections.findById(
      job.tenantId,
      job.principalId,
      job.connectionId,
    );
    if (!connection) {
      return { result: "drop", reason: "connection no longer exists" };
    }
    // Re-list while notifications land mid-pass, mirroring pullUntilQuiet: a
    // webhook that arrives while this job is CLAIMED coalesces onto it and
    // vanishes, so the moved change marker is the only signal that this pass
    // listed a snapshot from before the change. On giving up the marker stays
    // set and the daily rediscovery sweep covers the remainder.
    const { last: list, gaveUp } = await repeatWhileChanged(
      () => syncCalendarList(deps, connection, now),
      (result) => result.changedDuringSync,
      (pass) =>
        deps.log?.info?.(
          `Sync connection ${job.connectionId}: notification landed mid-discovery, re-listing (pass ${pass}/${MAX_PULL_PASSES})`,
        ),
    );
    if (gaveUp) {
      deps.log?.warn(
        `Sync connection ${job.connectionId}: still receiving calendar-list notifications after ${MAX_PULL_PASSES} discovery passes; leaving the rest to the rediscovery sweep`,
      );
    }
    // Discovery upserts display names, colors, and membership. Without a
    // connection invalidation the open SPA keeps the stale calendar list
    // (S40 gap: event pulls already invalidate, calendar-list sync did not).
    await deps.invalidations.append({
      tenantId: job.tenantId,
      principalId: job.principalId,
      invalidation: {
        kind: "connection",
        connectionId: job.connectionId,
      },
      emittedAt: now(),
    });
    if (needsWatch(list.resource)) {
      return {
        result: "done",
        followup: resourceJob(list.resource, "subscriptionMaintain", now()),
      };
    }
    return { result: "done" };
  }

  if (!job.resourceId) {
    return { result: "drop", reason: "job has no resourceId" };
  }
  const resource = await deps.resources.findById(
    job.tenantId,
    job.principalId,
    job.resourceId,
  );
  if (!resource) {
    return { result: "drop", reason: "resource no longer exists" };
  }
  if (resource.resourceKind === "calendarList") {
    if (job.kind !== "subscriptionMaintain") {
      return {
        result: "drop",
        reason: "calendar-list resource only accepts subscriptionMaintain",
      };
    }
    await maintainSubscription(deps, null, resource, now);
    return { result: "done" };
  }
  if (!resource.calendarId) {
    return { result: "drop", reason: "resource has no calendar" };
  }
  const calendar = await deps.calendars.findById(
    job.tenantId,
    job.principalId,
    resource.calendarId as ProviderCalendarRecord["_id"],
  );
  if (!calendar) {
    return { result: "drop", reason: "calendar no longer exists" };
  }
  // The provider no longer lists this calendar (discovery marked it inactive),
  // or the user turned it off. Nothing here is worth a provider call. Dropping
  // settles the job instead of leaving it to retry: a pending/failed
  // initialImport for a deactivated calendar kept its coalescing key and burned
  // Google quota on every sweep until an operator noticed (2026-07-30).
  if (!calendar.active) {
    return {
      result: "drop",
      reason: `calendar ${calendar._id} is inactive; sync resumes if it is reactivated`,
    };
  }

  switch (job.kind) {
    case "initialImport": {
      // Idempotent: a resource that already holds a cursor no-ops inside.
      // Notify the browser after the windowed horizon pass so events in the
      // current view can appear before the full historical scrape finishes.
      await importCalendarEvents(deps, calendar, now, {
        onWindowedPassComplete: async () => {
          await appendCalendarInvalidation(deps, calendar, now());
        },
      });
      // A cursor is not yet a trustworthy initial sync: Google changes can
      // land after the import's cursor but before the push channel exists.
      // Established resources stay ready during an idempotent import; a legacy
      // row without a cursor still follows the bootstrap path.
      if (needsBootstrapCompletion(resource)) {
        await deps.resources.setBootstrapState(
          resource.tenantId,
          resource.principalId,
          resource._id,
          "watching",
        );
      }
      // Full import finished — surface the remaining events. Connection state
      // leaves IMPORTING only after the subscription and post-watch pull.
      await appendCalendarInvalidation(deps, calendar, now());
      // Bootstrap the push channel once the calendar is imported. The followup
      // is coalesced and maintainSubscription no-ops on an already-live channel,
      // so a repeated import (a reclaimed lease, a re-import) never churns it.
      return {
        result: "done",
        followup: resourceJob(resource, "subscriptionMaintain", now()),
      };
    }
    case "incrementalPull": {
      const pull = await pullUntilQuiet(deps, calendar, now);
      if (pull.status === "applied") {
        await appendCalendarInvalidation(deps, calendar, now());
        // Bootstrap a channel for an imported calendar that has none. The
        // initialImport followup is otherwise the ONLY thing that ever opens
        // one, and the renewal sweep only renews channels that already exist
        // (listExpiringSubscriptions filters on subscriptionId), so a calendar
        // imported by any other route could never become watchable. Production
        // preseeded 938 calendars straight into the store during the Sync
        // cutover, bypassing that job: they held cursors, synced correctly, and
        // had no push channel with nothing in the system able to give them one
        // (2026-08-01). Pulls already run for every stale calendar, so
        // piggybacking here needs no new sweep and heals the whole fleet.
        //
        if (needsWatch(pull.resource)) {
          return {
            result: "done",
            followup: resourceJob(pull.resource, "subscriptionMaintain", now()),
          };
        }
        return { result: "done" };
      }
      if (pull.status === "notImported") {
        // A pull before the initial import ever ran: hand off to an import.
        return {
          result: "done",
          followup: resourceJob(resource, "initialImport", now()),
        };
      }
      // cursorExpired: the provider cursor is unusable; a repair rebuilds.
      deps.log?.warn(
        `Sync resource ${resource._id} (calendar ${calendar._id}): cursor expired on incremental pull, enqueuing repair`,
      );
      return {
        result: "done",
        followup: resourceJob(resource, "repair", now()),
      };
    }
    case "bootstrapCatchup": {
      // This pull closes the gap between saving the import cursor and making a
      // provider watch durable. It deliberately has its own job kind so an
      // unrelated reconcile/manual pull can never make a new connection look
      // ready before watch setup has completed.
      const pull = await pullUntilQuiet(deps, calendar, now);
      if (pull.status === "applied") {
        await deps.resources.setBootstrapState(
          resource.tenantId,
          resource.principalId,
          resource._id,
          "ready",
        );
        await appendCalendarInvalidation(deps, calendar, now());
        await refreshConnectionStateAfterBootstrap(deps, job);
        return { result: "done" };
      }
      if (pull.status === "notImported") {
        return {
          result: "done",
          followup: resourceJob(resource, "initialImport", now()),
        };
      }
      deps.log?.warn(
        `Sync resource ${resource._id} (calendar ${calendar._id}): cursor expired on bootstrap catch-up pull, enqueuing repair`,
      );
      return {
        result: "done",
        followup: resourceJob(resource, "repair", now()),
      };
    }
    case "repair": {
      const repair = await repairCalendar(deps, calendar, now);
      // An incomplete repair (the pass yielded no durable cursor) left the old
      // generation intact; retry the whole rebuild later rather than settle.
      if (repair.status === "repaired") {
        await appendCalendarInvalidation(deps, calendar, now());
        if (needsBootstrapCompletion(resource)) {
          return {
            result: "done",
            followup: resourceJob(
              repair.resource,
              "subscriptionMaintain",
              now(),
            ),
          };
        }
        return { result: "done" };
      }
      return { result: "retry", reason: "repair did not complete" };
    }
    case "subscriptionMaintain": {
      // Open or renew the push channel. Every terminal outcome (watched /
      // renewed / current / unsupported / authRevoked) settles the job —
      // including durable watchFailed, which maintainSubscription folds into
      // unsupported. A transient watch failure throws and the worker retries.
      const subscription = await maintainSubscription(
        deps,
        calendar,
        resource,
        now,
      );
      if (!needsBootstrapCompletion(resource)) {
        return { result: "done" };
      }
      // Unsupported means the provider will never push for this calendar (e.g.
      // Google's public holiday calendars) - there is no watch to align with, so
      // bootstrapCatchup's "close the gap before the channel" pull has nothing
      // to close. Without this branch, a resource that is BOTH unwatchable and
      // has an expired sync cursor loops forever: bootstrapCatchup's pull 410s
      // (cursorExpired) -> repair -> subscriptionMaintain -> unsupported again,
      // never reaching "ready" (2026-08-04, both staging soak test accounts'
      // Holidays calendars). The import that already ran is the best available
      // state; the reconcile sweep's periodic pulls keep it current from here.
      if (subscription.status === "unsupported") {
        deps.log?.warn(
          `Sync resource ${resource._id} (calendar ${calendar._id}): provider does not support watching this calendar, completing bootstrap without a push channel`,
        );
        await deps.resources.setBootstrapState(
          resource.tenantId,
          resource.principalId,
          resource._id,
          "ready",
        );
        await appendCalendarInvalidation(deps, calendar, now());
        await refreshConnectionStateAfterBootstrap(deps, job);
        return { result: "done" };
      }
      if (subscription.status !== "authRevoked") {
        await deps.resources.setBootstrapState(
          resource.tenantId,
          resource.principalId,
          resource._id,
          "catchingUp",
        );
        return {
          result: "done",
          followup: resourceJob(resource, "bootstrapCatchup", now()),
        };
      }
      await refreshConnectionStateAfterJob(deps, job, now);
      return { result: "done" };
    }
  }
}

// How many extra passes a single pull job will make to absorb notifications
// that land while it is running. A busy calendar can always produce one more
// change mid-pull; the bound stops that from holding a worker lane forever.
// On giving up, the change marker is left set and the reconcile sweep covers
// the remainder — slow, but bounded and visible in the log.
const MAX_PULL_PASSES = 3;

// Pull until no notification arrives mid-pull, then report the last result.
//
// A pull that reads the provider and THEN receives a notification has missed
// that change: the notification's enqueue coalesced onto this job's own claimed
// row and did nothing (JobRepository.enqueue is $setOnInsert-only), and this
// job's row is deleted the moment it settles. Re-pulling here is what closes
// that window. It cannot be done with a followup job — the worker enqueues
// followups BEFORE completing the current job (sync-job-worker.service.ts), so
// a followup sharing the `incrementalPull:<resourceId>` key would coalesce onto
// the very row it is meant to replace and vanish the same way.
//
// Each pass re-reads from the cursor the previous pass advanced, so a pass with
// nothing new is one cheap empty page.
// Re-run `run` while a notification lands mid-pass, bounded by MAX_PULL_PASSES.
// `gaveUp` is true when the last pass STILL saw a mid-pass change — the caller
// logs which sweep covers the remainder.
async function repeatWhileChanged<T>(
  run: () => Promise<T>,
  changedDuring: (result: T) => boolean,
  onRerun: (pass: number, previous: T) => void,
): Promise<{ last: T; passes: number; gaveUp: boolean }> {
  let last = await run();
  let passes = 1;
  while (changedDuring(last) && passes < MAX_PULL_PASSES) {
    onRerun(passes + 1, last);
    last = await run();
    passes += 1;
  }
  return { last, passes, gaveUp: changedDuring(last) };
}

async function pullUntilQuiet(
  deps: SyncJobDispatchDeps,
  calendar: ProviderCalendarRecord,
  now: () => Date,
): Promise<Awaited<ReturnType<typeof pullCalendarChanges>>> {
  const {
    last: pull,
    passes,
    gaveUp,
  } = await repeatWhileChanged(
    () => pullCalendarChanges(deps, calendar, now),
    (result) => result.status === "applied" && result.changedDuringPull,
    (pass, previous) =>
      deps.log?.info?.(
        `Sync resource ${previous.status === "applied" ? previous.resource._id : "unknown"} (calendar ${calendar._id}): notification landed mid-pull, re-pulling (pass ${pass}/${MAX_PULL_PASSES})`,
      ),
  );

  if (pull.status === "applied") {
    if (gaveUp) {
      deps.log?.warn(
        `Sync resource ${pull.resource._id} (calendar ${calendar._id}): still receiving notifications after ${MAX_PULL_PASSES} pull passes; leaving the rest to the reconcile sweep`,
      );
    }
    if (pull.pushLatencyMs !== null) {
      // The number that says whether the push path is meeting its ~30s bar or
      // quietly degrading to the 15-minute reconcile fallback. Nothing measured
      // this before, so "late" and "dropped" were indistinguishable after the
      // fact.
      deps.log?.info?.(
        `Sync resource ${pull.resource._id} (calendar ${calendar._id}): push latency ${pull.pushLatencyMs}ms over ${passes} pass(es), ${pull.changed} changed, ${pull.deleted} deleted`,
      );
    }
  }

  return pull;
}

function needsBootstrapCompletion(resource: SyncResourceRecord): boolean {
  return resource.bootstrapState !== "ready";
}

// Open a push channel once: never churn a live one, and never re-attempt a
// watch the provider terminally refused (watchUnsupportedAt) — the daily
// calendar-list full pass clears that verdict for one fresh attempt.
function needsWatch(resource: SyncResourceRecord): boolean {
  return (
    resource.subscriptionId === null && resource.watchUnsupportedAt === null
  );
}

// Push derived connection state after bootstrap evidence changes. At dispatch
// time the current job is still claimed, so derivation lands on catchingUp
// (still a change from importing → invalidation fires → client refetches →
// the read-path refresh after the job settles lands healthy). Never fail the
// job: state refresh is observational, not part of the provider work.
async function refreshConnectionStateAfterBootstrap(
  deps: SyncJobDispatchDeps,
  job: JobRecord,
): Promise<void> {
  await refreshConnectionStateAfterJob(deps, job);
}

async function appendCalendarInvalidation(
  deps: Pick<SyncJobDispatchDeps, "invalidations">,
  calendar: ProviderCalendarRecord,
  emittedAt: Date,
): Promise<void> {
  await deps.invalidations.append({
    tenantId: calendar.tenantId,
    principalId: calendar.principalId,
    invalidation: {
      kind: "calendar",
      connectionId: calendar.connectionId,
      calendarId: calendar._id,
    },
    emittedAt,
  });
}
