import { type DiagnosticConnectionResponse } from "@core/types/sync/diagnostic.contracts";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";

export interface ConnectionDiagnosticDeps {
  connections: ProviderConnectionRepository;
  calendars: ProviderCalendarRepository;
  jobs: JobRepository;
  commands: CommandRepository;
}

// Resolve a non-user-facing diagnostic key to connection metadata for
// authorized support tooling (R-OPS-05). Returns null when unknown.
export async function resolveDiagnosticConnection(
  deps: ConnectionDiagnosticDeps,
  diagnosticKey: string,
): Promise<DiagnosticConnectionResponse | null> {
  const connection = await deps.connections.findByDiagnosticKey(diagnosticKey);
  if (!connection) return null;

  const calendars = await deps.calendars.listByConnection(
    connection.tenantId,
    connection.principalId,
    connection._id,
  );
  const [pendingJobCount, pendingCommandCount] = await Promise.all([
    deps.jobs.countOutstandingByConnection(
      connection.tenantId,
      connection.principalId,
      connection._id,
    ),
    deps.commands.countNonterminalByConnection(
      connection.tenantId,
      connection.principalId,
      connection._id,
      calendars.map((calendar) => calendar._id),
    ),
  ]);

  return {
    diagnosticKey: connection.diagnosticKey,
    connectionId: connection._id,
    tenantId: connection.tenantId,
    principalId: connection.principalId,
    provider: connection.provider,
    state: connection.state,
    stateReason: connection.stateReason,
    accountEmail: connection.account.email,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    lastHealthyAt: connection.lastHealthyAt?.toISOString() ?? null,
    disconnectedAt: connection.disconnectedAt?.toISOString() ?? null,
    calendarCount: calendars.length,
    pendingJobCount,
    pendingCommandCount,
  };
}
