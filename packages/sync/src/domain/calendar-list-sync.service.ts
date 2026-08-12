import { type ProviderCalendarSourceId } from "@core/types/sync/identity.contracts";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
import {
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";
import { JOB_PRIORITY } from "@sync/storage/contracts/job.contracts";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface CalendarListSyncDeps {
  calendars: ProviderCalendarRepository;
  resources: SyncResourceRepository;
  jobs: JobRepository;
  discovery: ProviderCalendarAdapter;
  custody: AccessTokenSource;
  // Optional: a retirement is otherwise invisible (deactivateAbsent's result
  // was previously discarded entirely). Once discovery runs on a recurring
  // sweep rather than only at connect, retirements happen unattended and need
  // an audit trail. Defaults to a no-op so tests stay dependency-free.
  log?: { warn: (message: string) => void };
}

export interface CalendarListSyncResult {
  // How many calendars the provider returned this pass.
  readonly discovered: number;
  // How many active calendars had an initial import enqueued.
  readonly imported: number;
}

// Discover a connection's calendars and bootstrap their sync. This is the front
// of the sync chain: a fresh connection has no calendars and no events resource,
// so nothing else can run until discovery populates them.
//
// Reconcile the provider's calendar list into `provider_calendars`, then for each
// ACTIVE calendar ensure its events resource and enqueue an initial import (which
// imports the events and, in turn, opens the push channel). The calendarList
// resource carries the discovery cursor so a later pass lists incrementally.
//
// A cursored (incremental) pass returns only changed calendars, so absence does
// NOT mean removal — only a FULL pass retires calendars no longer listed. An
// expired cursor drops to a full re-list rather than retrying a dead token; any
// other discovery failure throws so the worker retries with backoff.
export async function syncCalendarList(
  deps: CalendarListSyncDeps,
  connection: ProviderConnectionRecord,
  now: () => Date,
): Promise<CalendarListSyncResult> {
  const { tenantId, principalId, _id: connectionId } = connection;

  // The calendarList resource (one per connection, null calendarId) holds the
  // discovery cursor across passes.
  const resource = await deps.resources.ensure({
    tenantId,
    principalId,
    connectionId,
    resourceKind: "calendarList",
    calendarId: null,
  });

  // Stamp the attempt before the token fetch can fail, mirroring the events
  // pull's rotation invariant: the rediscovery sweep sorts calendarList
  // resources by lastAttemptAt, and without this every such resource ties at
  // null forever, letting a permanently-failing connection re-win the front of
  // every sweep cycle (the 2026-07-29 dead-credential tie-break pathology,
  // here for calendarList instead of events).
  await deps.resources.markAttempt(tenantId, principalId, resource._id, now());

  const accessToken = await deps.custody.getValidAccessToken(connectionId);

  // Resume incrementally from the stored cursor; a cursorExpired verdict means
  // the token is too old, so re-list in full. Both leave `fullList` telling us
  // whether absence implies removal below.
  let fullList = resource.syncCursor === null;
  let discovery: Awaited<
    ReturnType<ProviderCalendarAdapter["discoverCalendars"]>
  >;
  try {
    discovery = await deps.discovery.discoverCalendars({
      accessToken,
      cursor: resource.syncCursor ?? undefined,
    });
  } catch (error) {
    if (
      error instanceof ProviderCalendarError &&
      error.reason === "cursorExpired"
    ) {
      fullList = true;
      discovery = await deps.discovery.discoverCalendars({ accessToken });
    } else {
      // transient / discoveryFailed / unexpected: rethrow. Durable discovery
      // refusals (discoveryFailed) are settled as drops in dispatchSyncJob;
      // transient failures stay on the worker retry ladder.
      throw error;
    }
  }

  // Upsert every discovered calendar (identity is the provider calendar id, so a
  // rename keeps its Sync _id), keeping the persisted records to bootstrap the
  // active ones below.
  const upserted = [];
  for (const calendar of discovery.calendars) {
    const record = await deps.calendars.upsertByProviderCalendar({
      tenantId,
      principalId,
      connectionId,
      // The discovery port reports the provider's calendar id as a plain string;
      // it is the provider source id, branded on the way into storage.
      providerCalendarId:
        calendar.providerCalendarId as ProviderCalendarSourceId,
      displayName: calendar.displayName,
      color: calendar.color,
      eventLabels: calendar.eventLabels,
      active: calendar.active,
      primary: calendar.primary,
      accessRole: calendar.accessRole,
      capabilities: calendar.capabilities,
    });
    upserted.push(record);
  }

  // Only a full pass sees the complete set, so only then can a calendar's absence
  // mean it was removed. An incremental pass reports removals as active:false
  // entries (handled by the upsert above), so it must not retire the absent.
  //
  // Guard on a non-empty result: an account always has at least a primary
  // calendar, so a full list of zero is treated as a non-answer (a provider
  // hiccup that returned empty instead of throwing) rather than "all removed" —
  // retiring every calendar on an empty blip would be user-visible damage.
  if (fullList && discovery.calendars.length > 0) {
    // A full pass is the retry cadence for unwatchable calendars: clear the
    // persisted watchUnsupportedAt verdicts so each gets one fresh watch
    // attempt (the pull path re-marks any the provider still refuses). Runs
    // daily via the rediscovery sweep — the pre-marker behavior was one
    // futile watch attempt per pull, forever.
    await deps.resources.clearWatchUnsupportedByConnection(
      tenantId,
      principalId,
      connectionId,
    );
    const retiredIds = await deps.calendars.deactivateAbsent(
      tenantId,
      principalId,
      connectionId,
      discovery.calendars.map(
        (c) => c.providerCalendarId as ProviderCalendarSourceId,
      ),
    );
    if (retiredIds.length > 0) {
      deps.log?.warn(
        `Sync retired ${retiredIds.length} calendar(s) absent from a full list on connection ${connectionId}: ${retiredIds.join(", ")}`,
      );
      // The calendar is gone at the provider, so its push channel (if any) can
      // never be renewed there. Dispatch already drops subscriptionMaintain for
      // an inactive calendar, which means its subscriptionExpiresAt never
      // advances — left alone, the row would squat at the head of every
      // renewal sweep forever (listExpiringSubscriptions sorts soonest-expiry
      // first with no other exclusion). Clearing the local fields here, rather
      // than calling the provider to stop the channel, is deliberate: the
      // calendar already 404s, and Google's channels lapse on their own within
      // 30 days regardless, so the remote channel is a harmless, self-healing
      // wart, not something worth a provider call and a new adapter dependency.
      const retiredIdSet = new Set<string>(retiredIds);
      const resources = await deps.resources.listByConnection(
        tenantId,
        principalId,
        connectionId,
      );
      const subscribedRetired = resources.filter(
        (r) =>
          r.calendarId &&
          retiredIdSet.has(r.calendarId) &&
          r.subscriptionId !== null,
      );
      // Independent writes to distinct resources: clear them concurrently
      // rather than one round trip per retired calendar.
      await Promise.all(
        subscribedRetired.map((r) =>
          deps.resources.clearSubscription(tenantId, principalId, r._id),
        ),
      );
    }
  }

  // Bootstrap events sync for each active calendar: ensure its events resource
  // and enqueue an initial import. The import is coalesced (same key an import
  // followup uses) and idempotent, so a re-discovery never double-imports.
  let imported = 0;
  for (const record of upserted) {
    if (!record.active) continue;
    const eventsResource = await deps.resources.ensure({
      tenantId,
      principalId,
      connectionId,
      resourceKind: "events",
      calendarId: record._id,
    });
    await deps.jobs.enqueue({
      tenantId,
      principalId,
      connectionId,
      resourceId: eventsResource._id,
      commandId: null,
      kind: "initialImport",
      priority: JOB_PRIORITY.background,
      runAfter: now(),
      coalescingKey: `initialImport:${eventsResource._id}`,
    });
    imported += 1;
  }

  // Stamp success (and clear any prior durable discovery failure) even when the
  // provider returns no next sync token. Google normally returns a nextSyncToken
  // on the final page; a null cursor means leave the stored token alone and
  // full-list again next pass rather than writing null.
  await deps.resources.advanceCursor(
    tenantId,
    principalId,
    resource._id,
    discovery.cursor,
    now(),
  );

  return { discovered: discovery.calendars.length, imported };
}
