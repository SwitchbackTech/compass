import { enqueueForResources } from "@sync/domain/resource-sweep-enqueue";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface BootstrapRecoveryDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
  // Reported per resource that fails to enqueue; the sweep continues.
  onEnqueueError?: (error: unknown, resourceId: string) => void;
}

// The bootstrap-recovery sweep — the self-heal for a lost bootstrap chain link.
// A resource born importing/watching/catchingUp normally advances to ready via
// its own followup chain (initialImport -> subscriptionMaintain ->
// bootstrapCatchup); nothing else drives it forward. If a link is ever lost -
// a durable failure drops the job with no followup, or any other way the chain
// settles without reaching ready or a retryable state - the resource is
// otherwise stuck forever: it holds no pending/failed job for any sweep to
// notice, and the connection reports IMPORTING with no time bound.
//
// Find events resources that are not "ready" and have not been touched since
// `before`, and enqueue a bootstrapCatchup for each; the worker drains them
// like any other job. bootstrapCatchup already self-routes from wherever the
// resource actually is (no cursor -> initialImport, expired cursor -> repair,
// applied -> ready), so re-entering here is safe regardless of which link was
// lost. Coalescing on `bootstrapCatchup:<id>` means a resource whose chain is
// still alive and has its own bootstrapCatchup in flight just collapses into
// that job rather than double-enqueueing.
//
// A GLOBAL scan across owners (system liveness, not a user request); each
// enqueued job carries the resource's own owner ids.
export function recoverStalledBootstraps(
  deps: BootstrapRecoveryDeps,
  before: Date,
  now: () => Date,
  limit = 100,
): Promise<number> {
  return enqueueForResources(
    deps,
    (b, l) => deps.resources.listStalledBootstraps(b, l),
    "bootstrapCatchup",
    before,
    now,
    limit,
  );
}
