import {
  type ConnectionStateEvidence,
  type CredentialState,
  deriveConnectionState,
} from "@sync/domain/connection-state";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { type InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface ConnectionStateRefreshDeps {
  connections: ProviderConnectionRepository;
  calendars: ProviderCalendarRepository;
  resources: SyncResourceRepository;
  credentials: CredentialRepository;
  jobs: JobRepository;
  // Optional so unit callers that only assert state can omit the outbox; the
  // HTTP list path always supplies it so UI clients learn about state changes.
  invalidations?: InvalidationRepository;
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
  const evidence = await gatherConnectionStateEvidence(deps, connection, at);
  const derived = deriveConnectionState(evidence, at);

  const lastSyncedAt = evidence.lastSyncedAt;
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

  const updated = await deps.connections.updateDerivedState(
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

  if (deps.invalidations) {
    await deps.invalidations.append({
      tenantId: connection.tenantId,
      principalId: connection.principalId,
      invalidation: {
        kind: "connection",
        connectionId: connection._id,
      },
      emittedAt: at,
    });
  }

  return updated;
}

export async function gatherConnectionStateEvidence(
  deps: ConnectionStateRefreshDeps,
  connection: ProviderConnectionRecord,
  now: Date,
): Promise<ConnectionStateEvidence & { lastSyncedAt: Date | null }> {
  const [credential, calendars, resources, oldestOverdue, catchingUp] =
    await Promise.all([
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
      deps.jobs.findOldestOverdueByConnection(
        connection.tenantId,
        connection.principalId,
        connection._id,
        now,
      ),
      deps.jobs.hasOutstandingReadWorkByConnection(
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
  const allActiveBootstrapReady =
    activeCalendars.length === 0 ||
    activeCalendars.every((c) => {
      const resource = eventsByCalendar.get(c._id);
      return (
        resource?.syncCursor != null && resource.bootstrapState === "ready"
      );
    });

  // "Last synced" must be as old as the least-recent active calendar. Taking
  // the newest success would let one busy calendar say "just now" while a
  // second visible calendar is stale. No active calendars fall back to the
  // calendar-list pass, which is the only provider data remaining to sync.
  const activeEventSuccessAts = activeCalendars.map(
    (calendar) => eventsByCalendar.get(calendar._id)?.lastSuccessAt ?? null,
  );
  const lastSyncedAt =
    activeEventSuccessAts.length === 0
      ? (calendarList?.lastSuccessAt ?? null)
      : activeEventSuccessAts.every((at) => at instanceof Date)
        ? minDate(...activeEventSuccessAts)
        : null;

  return {
    disconnectedAt: connection.disconnectedAt,
    credential: credentialState(credential),
    permanentConflict: false,
    // Only ACTIVE calendars count: a deactivated calendar's stale marker is not
    // a problem the user can act on, and its jobs are dropped anyway.
    durableReadFailure: activeCalendars.some(
      (c) => eventsByCalendar.get(c._id)?.lastReadFailureAt != null,
    ),
    accountIdentified: Boolean(connection.account.providerAccountId),
    // Discovery must have finished, and every currently-active calendar must
    // have a cursor plus a successful post-watch catch-up pull. A cursor alone
    // has a gap between the import and the provider watch registration.
    initialImportComplete: discoveryDone && allActiveBootstrapReady,
    catchingUp,
    oldestDueWorkAt: oldestOverdue?.runAfter ?? null,
    // A job that used up its retry ladder on retryableTransient failures is
    // itself provider-error evidence, distinct from a plain backlog.
    recentProviderErrors: oldestOverdue?.failureClass === "retryableTransient",
    lastSyncedAt,
  };
}

function credentialState(
  credential: Awaited<ReturnType<CredentialRepository["findByConnection"]>>,
): CredentialState {
  if (!credential?.refreshToken) return "revoked";
  return "valid";
}

function minDate(...dates: Array<Date | null | undefined>): Date | null {
  let min: Date | null = null;
  for (const d of dates) {
    if (!(d instanceof Date)) continue;
    if (!min || d.getTime() < min.getTime()) min = d;
  }
  return min;
}

function sameDate(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}
