import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  JOB_PRIORITY,
  type JobEnqueue,
} from "@sync/storage/contracts/job.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
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
  const tally: ConnectionRefreshTally = {
    resources: resources.length,
    created: 0,
    boosted: 0,
    requeuedFailed: 0,
    inFlight: 0,
  };

  // Revive every failed job (of any kind) for each connection this refresh
  // touches, not just the incrementalPull rows enqueueUrgent below revives via
  // coalescing key. Otherwise a wedged calendarListSync/initialImport/repair/
  // subscriptionMaintain row stays stuck even after the user asks to refresh.
  const connectionIds = [...new Set(resources.map((r) => r.connectionId))];
  const revivedCounts = await Promise.all(
    connectionIds.map((connectionId) =>
      deps.jobs.requeueFailedByConnection(
        tenantId,
        principalId,
        connectionId,
        runAfter,
      ),
    ),
  );
  tally.requeuedFailed += revivedCounts.reduce((sum, n) => sum + n, 0);

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
  for (const outcome of outcomes) {
    tally[outcome] += 1;
  }
  return tally;
}
