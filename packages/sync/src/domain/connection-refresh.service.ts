import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  JOB_PRIORITY,
  type JobEnqueue,
} from "@sync/storage/contracts/job.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface ConnectionRefreshDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
  connections: Pick<ProviderConnectionRepository, "listByPrincipal">;
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
  const [resources, connectionRecords] = await Promise.all([
    deps.resources.listEventsByPrincipal(tenantId, principalId),
    deps.connections.listByPrincipal(tenantId, principalId),
  ]);
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
  // Union connection rows with events-resource owners so a connection whose
  // calendars have no events resource (the missing-resource trap) still
  // requeues and re-runs discovery.
  const connectionIds = [
    ...new Set([
      ...connectionRecords.map((connection) => connection._id),
      ...resources.map((r) => r.connectionId),
    ]),
  ];
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

  // Re-run calendar-list discovery per connection so a Refresh heals
  // resource-less calendars (discovery creates the missing events resource
  // and enqueues its import). Coalesced per connection at user priority.
  await Promise.all(
    connectionIds.map((connectionId) =>
      deps.jobs.enqueueUrgent({
        tenantId,
        principalId,
        connectionId,
        resourceId: null,
        commandId: null,
        kind: "calendarListSync",
        priority: JOB_PRIORITY.user,
        runAfter,
        coalescingKey: `calendarListSync:${connectionId}`,
      }),
    ),
  );

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
