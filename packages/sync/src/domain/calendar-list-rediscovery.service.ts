import { enqueueForResources } from "@sync/domain/resource-sweep-enqueue";
import { JOB_PRIORITY } from "@sync/storage/contracts/job.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface CalendarListRediscoveryDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
  // Called once per calendarList resource whose cursor could not be cleared or
  // job could not be enqueued. The sweep keeps going; the caller decides how
  // loud to be.
  onError?: (error: unknown, resourceId: string) => void;
}

// Force a FULL calendar-list re-discovery for every connection whose last
// discovery is older than `before`, so a calendar deleted or unshared at the
// provider eventually gets retired even though calendarListSync otherwise only
// ever runs once, at connect (connection.routes.ts's registerConnection is the
// only other enqueue site).
//
// Shares enqueueForResources's per-resource try/catch loop (2026-07-31: one
// unparseable job doc froze calendar sync fleet-wide for 23h — the same hazard
// every sweep guards against) via its buildEnqueue override, since
// calendarListSync needs a shape the helper's default doesn't produce:
// connection-scoped (resourceId: null), keyed on the connect path's own
// coalescing key (`calendarListSync:${connectionId}`, not the helper's default
// `${kind}:${resource._id}`) so a sweep-enqueued and a connect-enqueued
// discovery for one connection always collapse into the same job, plus the
// cursor-clear side effect that must land inside the same try/catch as the
// enqueue.
//
// syncCalendarList decides full-vs-incremental purely from whether the stored
// cursor is null (`fullList = resource.syncCursor === null`), so clearing the
// cursor here is what forces the eventual pass to go full — it does not matter
// whether that pass is this sweep's own enqueue or one that coalesced onto an
// already-pending job; either reads the cleared cursor and full-lists.
export function rediscoverStaleCalendarLists(
  deps: CalendarListRediscoveryDeps,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  return enqueueForResources(
    { jobs: deps.jobs, onEnqueueError: deps.onError },
    (b, l) => deps.resources.listStaleCalendarLists(b, l),
    "calendarListSync",
    before,
    now,
    limit,
    async (resource, nowFn) => {
      await deps.resources.clearSyncCursor(
        resource.tenantId,
        resource.principalId,
        resource._id,
      );
      return {
        tenantId: resource.tenantId,
        principalId: resource.principalId,
        connectionId: resource.connectionId,
        resourceId: null,
        commandId: null,
        kind: "calendarListSync",
        priority: JOB_PRIORITY.background,
        runAfter: nowFn(),
        coalescingKey: `calendarListSync:${resource.connectionId}`,
      };
    },
  );
}
