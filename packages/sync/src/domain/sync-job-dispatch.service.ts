import { importCalendarEvents } from "@sync/domain/calendar-import.service";
import { syncCalendarList } from "@sync/domain/calendar-list-sync.service";
import { pullCalendarChanges } from "@sync/domain/calendar-pull.service";
import { repairCalendar } from "@sync/domain/calendar-repair.service";
import { type AccessTokenSource } from "@sync/domain/provider-command.service";
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
  JOB_PRIORITY,
  type JobEnqueue,
  type JobRecord,
} from "@sync/storage/contracts/job.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
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
  // Defaults to a no-op so tests stay dependency-free.
  log?: { warn: (message: string) => void };
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
      // A reasoned drop, not a bare done: settling is identical, but the worker
      // surfaces drop reasons. This path settled ~100 jobs per sweep invisibly
      // on 2026-07-29 (credential-less migrated connections), which made the
      // sweep look broken while it was running fine.
      return {
        result: "drop",
        reason: `credential unusable (${error.reason}) for connection ${job.connectionId}; sync resumes on reconnect`,
      };
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
      return {
        result: "drop",
        reason: `provider durably rejected reads for resource ${job.resourceId} (${detail}); sync resumes once the calendar is readable again`,
      };
    }

    // Same shape for calendar-list discovery: a durable 4xx (account not a
    // Calendar user, forbidden list, etc.) used to fall through as
    // retryableTransient and burn all 20 attempts, then trip the self-heal
    // requeue budget (2026-08-08: job 6a76454e… / connection 6a653974…).
    // Dropping frees the coalescing key so a later rediscovery or reconnect
    // can try again; stamp the calendarList resource so triage still has a
    // durable trace after the job row is gone.
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
      return {
        result: "drop",
        reason: `provider durably rejected calendar discovery for connection ${job.connectionId} (${detail}); sync resumes once the account can list calendars again`,
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
    await syncCalendarList(deps, connection, now);
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
      return { result: "done", followup: subscriptionFollowup(resource, now) };
    }
    case "incrementalPull": {
      const pull = await pullCalendarChanges(deps, calendar, now);
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
        // watchUnsupportedAt gates the followup: once the provider has
        // terminally refused a watch, re-attempting one per pull is pure
        // waste. The daily calendar-list full pass clears the marker for one
        // fresh attempt.
        if (
          pull.resource.subscriptionId === null &&
          pull.resource.watchUnsupportedAt === null
        ) {
          return {
            result: "done",
            followup: subscriptionFollowup(pull.resource, now),
          };
        }
        return { result: "done" };
      }
      if (pull.status === "notImported") {
        // A pull before the initial import ever ran: hand off to an import.
        return { result: "done", followup: importFollowup(resource, now) };
      }
      // cursorExpired: the provider cursor is unusable; a repair rebuilds.
      deps.log?.warn(
        `Sync resource ${resource._id} (calendar ${calendar._id}): cursor expired on incremental pull, enqueuing repair`,
      );
      return { result: "done", followup: repairFollowup(resource, now) };
    }
    case "bootstrapCatchup": {
      // This pull closes the gap between saving the import cursor and making a
      // provider watch durable. It deliberately has its own job kind so an
      // unrelated reconcile/manual pull can never make a new connection look
      // ready before watch setup has completed.
      const pull = await pullCalendarChanges(deps, calendar, now);
      if (pull.status === "applied") {
        await deps.resources.setBootstrapState(
          resource.tenantId,
          resource.principalId,
          resource._id,
          "ready",
        );
        await appendCalendarInvalidation(deps, calendar, now());
        return { result: "done" };
      }
      if (pull.status === "notImported") {
        return { result: "done", followup: importFollowup(resource, now) };
      }
      deps.log?.warn(
        `Sync resource ${resource._id} (calendar ${calendar._id}): cursor expired on bootstrap catch-up pull, enqueuing repair`,
      );
      return { result: "done", followup: repairFollowup(resource, now) };
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
            followup: subscriptionFollowup(repair.resource, now),
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
          followup: bootstrapCatchupFollowup(resource, now),
        };
      }
      return { result: "done" };
    }
  }
}

function repairFollowup(
  resource: SyncResourceRecord,
  now: () => Date,
): JobEnqueue {
  return {
    tenantId: resource.tenantId,
    principalId: resource.principalId,
    connectionId: resource.connectionId,
    resourceId: resource._id,
    commandId: null,
    kind: "repair",
    priority: JOB_PRIORITY.background,
    runAfter: now(),
    coalescingKey: `repair:${resource._id}`,
  };
}

function importFollowup(
  resource: SyncResourceRecord,
  now: () => Date,
): JobEnqueue {
  return {
    tenantId: resource.tenantId,
    principalId: resource.principalId,
    connectionId: resource.connectionId,
    resourceId: resource._id,
    commandId: null,
    kind: "initialImport",
    priority: JOB_PRIORITY.background,
    runAfter: now(),
    coalescingKey: `initialImport:${resource._id}`,
  };
}

function bootstrapCatchupFollowup(
  resource: SyncResourceRecord,
  now: () => Date,
): JobEnqueue {
  return {
    tenantId: resource.tenantId,
    principalId: resource.principalId,
    connectionId: resource.connectionId,
    resourceId: resource._id,
    commandId: null,
    kind: "bootstrapCatchup",
    priority: JOB_PRIORITY.background,
    runAfter: now(),
    coalescingKey: `bootstrapCatchup:${resource._id}`,
  };
}

function needsBootstrapCompletion(resource: SyncResourceRecord): boolean {
  return resource.bootstrapState !== "ready";
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

function subscriptionFollowup(
  resource: SyncResourceRecord,
  now: () => Date,
): JobEnqueue {
  return {
    tenantId: resource.tenantId,
    principalId: resource.principalId,
    connectionId: resource.connectionId,
    resourceId: resource._id,
    commandId: null,
    kind: "subscriptionMaintain",
    priority: JOB_PRIORITY.background,
    runAfter: now(),
    // The same key the expiry sweep uses, so a bootstrap watch and a renewal
    // never double up into two channels.
    coalescingKey: `subscriptionMaintain:${resource._id}`,
  };
}
