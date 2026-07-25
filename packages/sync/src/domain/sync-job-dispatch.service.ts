import { importCalendarEvents } from "@sync/domain/calendar-import.service";
import { syncCalendarList } from "@sync/domain/calendar-list-sync.service";
import { pullCalendarChanges } from "@sync/domain/calendar-pull.service";
import { repairCalendar } from "@sync/domain/calendar-repair.service";
import { type AccessTokenSource } from "@sync/domain/provider-command.service";
import { maintainSubscription } from "@sync/domain/subscription-maintenance.service";
import { type ProviderCalendarAdapter } from "@sync/providers/provider-calendar.port";
import { type ProviderEventReader } from "@sync/providers/provider-event-reader.port";
import { type ProviderNotificationAdapter } from "@sync/providers/provider-notifications.port";
import {
  type JobEnqueue,
  type JobFailureClass,
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
}

// The decision a dispatch makes about a claimed job. The worker loop (a later
// slice) owns the lease and turns this into a JobRepository call; keeping the
// decision pure keeps dispatch trivially testable without a queue.
export type SyncJobOutcome =
  // The work is done; settle the job complete. `followup`, when present, is a
  // new job to enqueue (coalesced) — e.g. an expired pull hands off to a repair.
  | { readonly result: "done"; readonly followup?: JobEnqueue }
  // A transient, self-correcting condition; return the job to pending to retry.
  | {
      readonly result: "retry";
      readonly failureClass: JobFailureClass;
      readonly reason: string;
    }
  // Nothing to act on — the job's target vanished (resource/calendar deleted) or
  // the job is malformed for its kind. Settle complete; retrying can't help.
  | { readonly result: "drop"; readonly reason: string }
  // This kind is not a provider-calendar sync job (commandApply, reconcile).
  // Dispatch here does not own it; the loop routes it.
  | { readonly result: "unsupported"; readonly kind: JobRecord["kind"] };

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

  if (
    job.kind !== "initialImport" &&
    job.kind !== "incrementalPull" &&
    job.kind !== "repair" &&
    job.kind !== "subscriptionMaintain"
  ) {
    return { result: "unsupported", kind: job.kind };
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

  switch (job.kind) {
    case "initialImport": {
      // Idempotent: a resource that already holds a cursor no-ops inside.
      await importCalendarEvents(deps, calendar, now);
      // Bootstrap the push channel once the calendar is imported. The followup
      // is coalesced and maintainSubscription no-ops on an already-live channel,
      // so a repeated import (a reclaimed lease, a re-import) never churns it.
      return { result: "done", followup: subscriptionFollowup(resource, now) };
    }
    case "incrementalPull": {
      const pull = await pullCalendarChanges(deps, calendar, now);
      if (pull.status === "applied") {
        await appendCalendarInvalidation(deps, calendar, now());
        return { result: "done" };
      }
      if (pull.status === "notImported") {
        // A pull before the initial import ever ran: hand off to an import.
        return { result: "done", followup: importFollowup(resource, now) };
      }
      // cursorExpired: the provider cursor is unusable; a repair rebuilds.
      return { result: "done", followup: repairFollowup(resource, now) };
    }
    case "repair": {
      const repair = await repairCalendar(deps, calendar, now);
      // An incomplete repair (the pass yielded no durable cursor) left the old
      // generation intact; retry the whole rebuild later rather than settle.
      if (repair.status === "repaired") {
        await appendCalendarInvalidation(deps, calendar, now());
        return { result: "done" };
      }
      return {
        result: "retry",
        failureClass: "retryableTransient",
        reason: "repair did not complete",
      };
    }
    case "subscriptionMaintain": {
      // Open or renew the push channel. Every terminal outcome (watched /
      // renewed / current / unsupported / authRevoked) settles the job; a
      // transient watch failure throws and the worker retries with backoff.
      await maintainSubscription(deps, calendar, resource, now);
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
    priority: 0,
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
    priority: 0,
    runAfter: now(),
    coalescingKey: `initialImport:${resource._id}`,
  };
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
    priority: 0,
    runAfter: now(),
    // The same key the expiry sweep uses, so a bootstrap watch and a renewal
    // never double up into two channels.
    coalescingKey: `subscriptionMaintain:${resource._id}`,
  };
}
