import { enqueueForResources } from "@sync/domain/resource-sweep-enqueue";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface SubscriptionSweepDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
}

// The subscription-maintenance sweep. Find events resources whose push channel
// expires before `before` and enqueue a subscriptionMaintain job for each; the
// worker renews them like any other job. Returns how many it enqueued.
//
// The job's coalescing key (`subscriptionMaintain:<id>`) matches the bootstrap
// followup an initialImport enqueues, so a renewal that races a fresh import
// collapses into one job rather than opening two channels. Only resources that
// already hold a channel are swept (the finder filters on subscriptionId): a
// never-watched calendar gets its first channel from the import followup, so an
// unwatchable one is not re-enqueued here on every pass.
//
// A GLOBAL scan across owners (this is system liveness, not a user request);
// each enqueued job carries the resource's own owner ids. The periodic trigger
// that drives this on an interval is a separate slice.
export function maintainExpiringSubscriptions(
  deps: SubscriptionSweepDeps,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  return enqueueForResources(
    deps,
    (b, l) => deps.resources.listExpiringSubscriptions(b, l),
    "subscriptionMaintain",
    before,
    now,
    limit,
  );
}
