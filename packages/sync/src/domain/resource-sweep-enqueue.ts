import {
  JOB_PRIORITY,
  type JobEnqueue,
  type JobKind,
} from "@sync/storage/contracts/job.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";

// The shared shape behind every sweep app.ts wires up (reconcile, subscription
// maintenance, bootstrap recovery): find due resources with `finder`, enqueue
// one `kind` job per resource, and return how many were enqueued. The only
// difference between sweeps is which finder they call and which job kind they
// enqueue — everything else, including the coalescing key template, is
// identical, so each sweep site calls this directly rather than through its
// own wrapper.
//
// Each resource is enqueued independently: one that throws is reported and
// skipped, never allowed to abandon the rest of the batch. The sweeps are the
// only liveness path for resources without a push channel, and the finders sort
// deterministically, so a single doomed resource at the front of the ordering
// would otherwise starve every resource behind it on every cycle, forever
// (2026-07-31: one unparseable job doc froze calendar sync fleet-wide for 23h).
export async function enqueueForResources(
  deps: {
    jobs: JobRepository;
    // Called once per resource that could not be enqueued. The sweep keeps
    // going; the caller decides how loud to be.
    onEnqueueError?: (error: unknown, resourceId: string) => void;
  },
  finder: (before: Date, limit: number) => Promise<SyncResourceRecord[]>,
  kind: JobKind,
  before: Date,
  now: () => Date,
  limit = 100,
  // Override the default resource-scoped enqueue shape. Only calendar-list
  // rediscovery needs this: calendarListSync is connection-scoped
  // (resourceId: null) and must reuse the connect path's own coalescing key
  // (`calendarListSync:${connectionId}`) rather than this helper's default
  // `${kind}:${resource._id}` template, and it has a side effect (clearing
  // the stored discovery cursor) that must happen inside the same per-resource
  // try/catch as the enqueue, not before the loop starts. Every other sweep
  // omits this and gets the default shape below.
  buildEnqueue?: (
    resource: SyncResourceRecord,
    now: () => Date,
  ) => JobEnqueue | Promise<JobEnqueue>,
): Promise<number> {
  const due = await finder(before, limit);
  let enqueued = 0;
  for (const resource of due) {
    try {
      const enqueue: JobEnqueue = buildEnqueue
        ? await buildEnqueue(resource, now)
        : {
            tenantId: resource.tenantId,
            principalId: resource.principalId,
            connectionId: resource.connectionId,
            resourceId: resource._id,
            commandId: null,
            kind,
            priority: JOB_PRIORITY.background,
            runAfter: now(),
            coalescingKey: `${kind}:${resource._id}`,
          };
      await deps.jobs.enqueue(enqueue);
      enqueued += 1;
    } catch (error) {
      deps.onEnqueueError?.(error, resource._id);
    }
  }
  return enqueued;
}
