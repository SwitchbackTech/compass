import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  JOB_PRIORITY,
  type JobEnqueue,
} from "@sync/storage/contracts/job.contracts";
import {
  type EnqueueUrgentOutcome,
  type JobRepository,
} from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface ConnectionRefreshDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
}

export type ConnectionRefreshTally = {
  resources: number;
  created: number;
  boosted: number;
  requeuedFailed: number;
  inFlight: number;
};

const emptyTally = (): ConnectionRefreshTally => ({
  resources: 0,
  created: 0,
  boosted: 0,
  requeuedFailed: 0,
  inFlight: 0,
});

function countOutcome(
  tally: ConnectionRefreshTally,
  outcome: EnqueueUrgentOutcome,
): void {
  tally[outcome === "requeuedFailed" ? "requeuedFailed" : outcome] += 1;
}

/**
 * Enqueue (or boost) an incremental pull for every events resource owned by
 * the principal. Uses enqueueUrgent so a repeat Refresh pulls runAfter forward
 * and raises priority; coalesces with webhook/reconcile pulls on the same key
 * so work already in flight is reported rather than double-started.
 * Resources without a sync cursor become `initialImport` via the pull
 * dispatch followup (`notImported`).
 */
export async function refreshPrincipalCalendars(
  deps: ConnectionRefreshDeps,
  tenantId: TenantId,
  principalId: PrincipalId,
  now: () => Date = () => new Date(),
): Promise<ConnectionRefreshTally> {
  const resources = await deps.resources.listEventsByPrincipal(
    tenantId,
    principalId,
  );
  const runAfter = now();
  const tally = emptyTally();
  tally.resources = resources.length;

  const outcomes = await Promise.all(
    resources.map(async (resource) => {
      const enqueue: JobEnqueue = {
        tenantId: resource.tenantId,
        principalId: resource.principalId,
        connectionId: resource.connectionId,
        resourceId: resource._id,
        commandId: null,
        kind: "incrementalPull",
        priority: JOB_PRIORITY.user,
        runAfter,
        coalescingKey: `incrementalPull:${resource._id}`,
      };
      const { outcome } = await deps.jobs.enqueueUrgent(enqueue);
      return outcome;
    }),
  );
  for (const outcome of outcomes) countOutcome(tally, outcome);
  return tally;
}
