import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { type PrincipalPurgeResponse } from "@core/types/sync/principal.contracts";
import { type CredentialCustody } from "@sync/credentials/credential-custody.service";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { type DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface PrincipalPurgeDeps {
  connections: ProviderConnectionRepository;
  credentials: CredentialRepository;
  calendars: ProviderCalendarRepository;
  events: EventRepository;
  eventOccurrences: EventOccurrenceRepository;
  syncResources: SyncResourceRepository;
  commands: CommandRepository;
  jobs: JobRepository;
  deletionMarkers: DeletionMarkerRepository;
  invalidations: InvalidationRepository;
  // When present, best-effort revoke at the provider before deleting each
  // credential. Absent (passive / unconfigured) still deletes credentials
  // locally — account deletion must not leave Sync-held tokens behind.
  custody?: CredentialCustody;
}

// Remove every Sync-held row for one principal. Overrides ordinary disconnect
// retention: connections are hard-deleted, not soft-disconnected. Idempotent —
// a second call reports zeros. Credentials are keyed only by connectionId, so
// they are revoked/deleted from the connection list before connections go.
export async function purgePrincipal(
  deps: PrincipalPurgeDeps,
  tenantId: TenantId,
  principalId: PrincipalId,
): Promise<PrincipalPurgeResponse> {
  const connections = await deps.connections.listByPrincipal(
    tenantId,
    principalId,
  );

  let credentials = 0;
  for (const connection of connections) {
    if (deps.custody) {
      const existed = await deps.credentials.findByConnection(connection._id);
      await deps.custody.disconnect(connection._id);
      if (existed) credentials += 1;
    } else if (await deps.credentials.deleteByConnection(connection._id)) {
      credentials += 1;
    }
  }

  // After credentials: drop dependent rows, then the connection records.
  // Parallel deletes are safe — each collection is independently scoped.
  const [
    jobs,
    syncResources,
    eventOccurrences,
    events,
    deletionMarkers,
    calendars,
    commands,
    invalidations,
    connectionCount,
  ] = await Promise.all([
    deps.jobs.deleteByPrincipal(tenantId, principalId),
    deps.syncResources.deleteByPrincipal(tenantId, principalId),
    deps.eventOccurrences.deleteByPrincipal(tenantId, principalId),
    deps.events.deleteByPrincipal(tenantId, principalId),
    deps.deletionMarkers.deleteByPrincipal(tenantId, principalId),
    deps.calendars.deleteByPrincipal(tenantId, principalId),
    deps.commands.deleteByPrincipal(tenantId, principalId),
    deps.invalidations.deleteByPrincipal(tenantId, principalId),
    deps.connections.deleteByPrincipal(tenantId, principalId),
  ]);

  return {
    connections: connectionCount,
    credentials,
    calendars,
    events,
    eventOccurrences,
    syncResources,
    commands,
    jobs,
    deletionMarkers,
    invalidations,
  };
}
