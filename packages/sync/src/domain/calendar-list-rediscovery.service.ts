import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface CalendarListRediscoveryDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
  // Called once per connection whose cursor could not be cleared or job could
  // not be enqueued. The sweep keeps going; the caller decides how loud to be.
  onError?: (error: unknown, connectionId: string) => void;
}

// Force a FULL calendar-list re-discovery for every connection whose last
// discovery is older than `before`, so a calendar deleted or unshared at the
// provider eventually gets retired even though calendarListSync otherwise only
// ever runs once, at connect (connection.routes.ts's registerConnection is the
// only other enqueue site).
//
// This is NOT a thin wrapper around enqueueForResources: that helper always
// enqueues resourceId: resource._id and coalescingKey: `${kind}:${resource._id}`,
// but calendarListSync is connection-scoped (resourceId: null) and MUST reuse
// the connect path's exact coalescing key (`calendarListSync:${connectionId}`).
// Minting a different key would let a sweep-enqueued discovery and a
// connect-enqueued discovery run concurrently on one connection — two passes
// racing over one cursor is how an incremental pass's advanceCursor clobbers a
// full pass this cycle just cleared.
//
// syncCalendarList decides full-vs-incremental purely from whether the stored
// cursor is null (`fullList = resource.syncCursor === null`), so clearing the
// cursor here is what forces the eventual pass to go full — it does not matter
// whether that pass is this sweep's own enqueue or one that coalesced onto an
// already-pending job; either reads the cleared cursor and full-lists.
//
// Each connection is handled independently: one that throws is reported and
// skipped, never allowed to abandon the rest of the batch (2026-07-31: one
// unparseable job doc froze calendar sync fleet-wide for 23h — same hazard
// class enqueueForResources guards against).
export async function rediscoverStaleCalendarLists(
  deps: CalendarListRediscoveryDeps,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  const due = await deps.resources.listStaleCalendarLists(before, limit);
  let enqueued = 0;
  for (const resource of due) {
    try {
      await deps.resources.clearSyncCursor(
        resource.tenantId,
        resource.principalId,
        resource._id,
      );
      await deps.jobs.enqueue({
        tenantId: resource.tenantId,
        principalId: resource.principalId,
        connectionId: resource.connectionId,
        resourceId: null,
        commandId: null,
        kind: "calendarListSync",
        priority: 0,
        runAfter: now(),
        coalescingKey: `calendarListSync:${resource.connectionId}`,
      });
      enqueued += 1;
    } catch (error) {
      deps.onError?.(error, resource.connectionId);
    }
  }
  return enqueued;
}
