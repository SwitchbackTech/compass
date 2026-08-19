import { type JobEnqueue } from "@sync/storage/contracts/job.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";

// The shared loop behind every sweep app.ts wires up (reconcile, subscription
// maintenance, bootstrap recovery, calendar-list rediscovery): find due
// resources with `finder`, enqueue the job `build` produces for each (usually
// `resourceJob(resource, kind, now())`), and return how many were enqueued.
// `build` runs inside the per-resource try/catch, so a per-resource side
// effect (rediscovery's cursor clear) fails that resource alone.
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
  build: (
    resource: SyncResourceRecord,
    now: () => Date,
  ) => JobEnqueue | Promise<JobEnqueue>,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  const due = await finder(before, limit);
  let enqueued = 0;
  for (const resource of due) {
    try {
      await deps.jobs.enqueue(await build(resource, now));
      enqueued += 1;
    } catch (error) {
      deps.onEnqueueError?.(error, resource._id);
    }
  }
  return enqueued;
}
