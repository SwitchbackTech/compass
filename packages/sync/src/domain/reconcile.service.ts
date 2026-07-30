import { enqueueForResources } from "@sync/domain/resource-sweep-enqueue";
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
export function reconcileStaleCalendars(
  deps: ReconcileDeps,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  return enqueueForResources(
    deps,
    (b, l) => deps.resources.listStaleEvents(b, l),
    "incrementalPull",
    before,
    now,
    limit,
  );
}
