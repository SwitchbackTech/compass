import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { type DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

// Soft-disconnected connections keep cached provider event content for at most
// this long (R-CONN-06). Account deletion bypasses the window via purgePrincipal.
export const CONNECTION_CACHE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface ConnectionRetentionDeps {
  connections: ProviderConnectionRepository;
  credentials: CredentialRepository;
  calendars: ProviderCalendarRepository;
  events: EventRepository;
  eventOccurrences: EventOccurrenceRepository;
  syncResources: SyncResourceRepository;
  jobs: JobRepository;
  deletionMarkers: DeletionMarkerRepository;
}

// Remove one soft-disconnected connection's retained cache and the connection
// row itself. Credentials were already revoked/deleted at disconnect; this is
// a belt-and-suspenders delete. Does not touch other connections on the
// principal, Compass-owned unlinked events, commands, or invalidations
// (invalidations already TTL out).
export async function purgeDisconnectedConnection(
  deps: ConnectionRetentionDeps,
  connection: ProviderConnectionRecord,
): Promise<void> {
  const tenantId = connection.tenantId;
  const principalId = connection.principalId;
  const connectionId = connection._id;

  const calendars = await deps.calendars.listByConnection(
    tenantId,
    principalId,
    connectionId,
  );
  const calendarIds = calendars.map((calendar) => calendar._id);

  await Promise.all([
    deps.eventOccurrences.deleteByCalendars(tenantId, principalId, calendarIds),
    deps.events.deleteByConnection(tenantId, principalId, connectionId),
    deps.deletionMarkers.deleteByConnection(
      tenantId,
      principalId,
      connectionId,
    ),
    deps.syncResources.deleteByConnection(tenantId, principalId, connectionId),
    deps.jobs.deleteByConnection(tenantId, principalId, connectionId),
    deps.credentials.deleteByConnection(connectionId),
  ]);
  await deps.calendars.deleteByConnection(tenantId, principalId, connectionId);
  await deps.connections.deleteById(tenantId, principalId, connectionId);
}

// Purge soft-disconnected connections whose disconnectedAt is before `before`
// (typically now − 30d). Oldest first, bounded. Returns how many connections
// were purged. Local-only — safe in passive mode.
export async function purgeExpiredDisconnectedConnections(
  deps: ConnectionRetentionDeps,
  before: Date,
  limit = 100,
): Promise<number> {
  const expired = await deps.connections.listDisconnectedBefore(before, limit);
  for (const connection of expired) {
    await purgeDisconnectedConnection(deps, connection);
  }
  return expired.length;
}
