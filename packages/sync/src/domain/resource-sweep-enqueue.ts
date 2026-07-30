import {
  type JobEnqueue,
  type JobKind,
} from "@sync/storage/contracts/job.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";

// The shared shape behind reconcile.service.ts and subscription-sweep.service.ts:
// find due resources with `finder`, enqueue one `kind` job per resource, and
// return how many. The only difference between the two sweeps is which finder
// they call and which job kind they enqueue — everything else, including the
// coalescing key template, is identical.
export async function enqueueForResources(
  deps: { jobs: JobRepository },
  finder: (before: Date, limit: number) => Promise<SyncResourceRecord[]>,
  kind: JobKind,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  const due = await finder(before, limit);
  for (const resource of due) {
    const enqueue: JobEnqueue = {
      tenantId: resource.tenantId,
      principalId: resource.principalId,
      connectionId: resource.connectionId,
      resourceId: resource._id,
      commandId: null,
      kind,
      priority: 0,
      runAfter: now(),
      coalescingKey: `${kind}:${resource._id}`,
    };
    await deps.jobs.enqueue(enqueue);
  }
  return due.length;
}
