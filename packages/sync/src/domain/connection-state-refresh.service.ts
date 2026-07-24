import {
  type ConnectionStateEvidence,
  type CredentialState,
  deriveConnectionState,
} from "@sync/domain/connection-state";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface ConnectionStateRefreshDeps {
  connections: ProviderConnectionRepository;
  calendars: ProviderCalendarRepository;
  resources: SyncResourceRepository;
  credentials: CredentialRepository;
}

// Re-derive a connection's user-facing state from live evidence and persist it.
// Stored state at OAuth link time is always "importing"; without this refresh
// the UI stays on "Syncing calendar" forever after the import chain finishes.
export async function refreshConnectionState(
  deps: ConnectionStateRefreshDeps,
  connection: ProviderConnectionRecord,
  now: () => Date = () => new Date(),
): Promise<ProviderConnectionRecord> {
  const at = now();
  const evidence = await gatherConnectionStateEvidence(deps, connection);
  const derived = deriveConnectionState(evidence, at);

  const lastSyncedAt = maxDate(
    connection.lastSyncedAt,
    ...evidence.resourceSuccessAts,
  );
  const lastHealthyAt =
    derived.state === "healthy"
      ? (connection.lastHealthyAt ?? at)
      : connection.lastHealthyAt;

  if (
    connection.state === derived.state &&
    connection.stateReason === derived.reason &&
    sameDate(connection.lastSyncedAt, lastSyncedAt) &&
    sameDate(connection.lastHealthyAt, lastHealthyAt)
  ) {
    return connection;
  }

  return deps.connections.updateDerivedState(
    connection.tenantId,
    connection.principalId,
    connection._id,
    {
      state: derived.state,
      stateReason: derived.reason,
      lastSyncedAt,
      lastHealthyAt,
    },
    at,
  );
}

export async function gatherConnectionStateEvidence(
  deps: ConnectionStateRefreshDeps,
  connection: ProviderConnectionRecord,
): Promise<ConnectionStateEvidence & { resourceSuccessAts: Date[] }> {
  const [credential, calendars, resources] = await Promise.all([
    deps.credentials.findByConnection(connection._id),
    deps.calendars.listByConnection(
      connection.tenantId,
      connection.principalId,
      connection._id,
    ),
    deps.resources.listByConnection(
      connection.tenantId,
      connection.principalId,
      connection._id,
    ),
  ]);

  const activeCalendars = calendars.filter((c) => c.active);
  const eventsByCalendar = new Map(
    resources
      .filter((r) => r.resourceKind === "events" && r.calendarId)
      .map((r) => [r.calendarId as string, r]),
  );
  const calendarList = resources.find((r) => r.resourceKind === "calendarList");
  const discoveryDone = calendarList?.lastSuccessAt != null;
  const allActiveImported =
    activeCalendars.length === 0 ||
    activeCalendars.every(
      (c) => eventsByCalendar.get(c._id)?.syncCursor != null,
    );

  const resourceSuccessAts = resources
    .map((r) => r.lastSuccessAt)
    .filter((d): d is Date => d instanceof Date);

  return {
    disconnectedAt: connection.disconnectedAt,
    credential: credentialState(credential),
    permanentConflict: false,
    accountIdentified: Boolean(connection.account.providerAccountId),
    // Discovery must have finished, and every currently-active calendar must
    // hold a durable events cursor (the initialImport settle condition).
    initialImportComplete: discoveryDone && allActiveImported,
    catchingUp: false,
    oldestDueWorkAt: null,
    recentProviderErrors: false,
    resourceSuccessAts,
  };
}

function credentialState(
  credential: Awaited<ReturnType<CredentialRepository["findByConnection"]>>,
): CredentialState {
  if (!credential?.refreshToken) return "revoked";
  return "valid";
}

function maxDate(...dates: Array<Date | null | undefined>): Date | null {
  let max: Date | null = null;
  for (const d of dates) {
    if (!(d instanceof Date)) continue;
    if (!max || d.getTime() > max.getTime()) max = d;
  }
  return max;
}

function sameDate(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}
