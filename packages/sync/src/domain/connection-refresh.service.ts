import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { type JobEnqueue } from "@sync/storage/contracts/job.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface ConnectionRefreshDeps {
  resources: SyncResourceRepository;
  jobs: JobRepository;
}

/**
 * Enqueue an incremental pull for every events resource owned by the
 * principal. Coalesces with webhook/reconcile pulls on the same key so a
 * user "Refresh" during an already-running catch-up does not double work.
 * Resources without a sync cursor become `initialImport` via the pull
 * dispatch followup (`notImported`).
 */
export async function refreshPrincipalCalendars(
  deps: ConnectionRefreshDeps,
  tenantId: TenantId,
  principalId: PrincipalId,
  now: () => Date = () => new Date(),
): Promise<number> {
  const resources = await deps.resources.listEventsByPrincipal(
    tenantId,
    principalId,
  );
  const runAfter = now();
  for (const resource of resources) {
    const enqueue: JobEnqueue = {
      tenantId: resource.tenantId,
      principalId: resource.principalId,
      connectionId: resource.connectionId,
      resourceId: resource._id,
      commandId: null,
      kind: "incrementalPull",
      priority: 0,
      runAfter,
      coalescingKey: `incrementalPull:${resource._id}`,
    };
    await deps.jobs.enqueue(enqueue);
  }
  return resources.length;
}
