import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface ReconcileDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
}

// The reconcile sweep — the missed-webhook fallback. Find events resources that
// have not synced since `before` (or never did) and enqueue an incremental pull
// for each; the worker drains them like any other job. Returns how many it
// enqueued.
//
// The pull job's coalescing key matches the webhook's (`incrementalPull:<id>`),
// so a reconcile that races a live notification collapses into one job rather
// than double-pulling. A never-imported resource enqueues a pull too: dispatch
// turns that into an initial import (its `notImported` -> import followup), so
// this one sweep both bootstraps new calendars and refreshes stale ones.
//
// A GLOBAL scan across owners (reconcile is system liveness, not a user
// request); each enqueued job carries the resource's own owner ids. The periodic
// trigger that calls this on a jittered interval is a separate slice — this is
// the sweep it drives.
export async function reconcileStaleCalendars(
  deps: ReconcileDeps,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  const stale = await deps.resources.listStaleEvents(before, limit);
  for (const resource of stale) {
    await deps.jobs.enqueue({
      tenantId: resource.tenantId,
      principalId: resource.principalId,
      connectionId: resource.connectionId,
      resourceId: resource._id,
      commandId: null,
      kind: "incrementalPull",
      priority: 0,
      runAfter: now(),
      coalescingKey: `incrementalPull:${resource._id}`,
    });
  }
  return stale.length;
}
