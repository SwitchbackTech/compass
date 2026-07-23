import { type ProviderCalendarSourceId } from "@core/types/sync/identity.contracts";
import { type AccessTokenSource } from "@sync/domain/provider-command.service";
import {
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";
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
      // discoveryFailed or unexpected: transient, let the worker retry.
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
  if (fullList) {
    await deps.calendars.deactivateAbsent(
      tenantId,
      principalId,
      connectionId,
      discovery.calendars.map(
        (c) => c.providerCalendarId as ProviderCalendarSourceId,
      ),
    );
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
      priority: 0,
      runAfter: now(),
      coalescingKey: `initialImport:${eventsResource._id}`,
    });
    imported += 1;
  }

  // Record the new discovery cursor so the next pass lists incrementally. Google
  // always returns a nextSyncToken on the final page; if a provider ever returns
  // none, we simply full-list again next pass rather than store a null cursor.
  if (discovery.cursor) {
    await deps.resources.advanceCursor(
      tenantId,
      principalId,
      resource._id,
      discovery.cursor,
      now(),
    );
  }

  return { discovered: discovery.calendars.length, imported };
}
