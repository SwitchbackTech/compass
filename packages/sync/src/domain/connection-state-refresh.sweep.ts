import {
  type ConnectionStateRefreshDeps,
  refreshConnectionState,
} from "@sync/domain/connection-state-refresh.service";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";

// Re-derive stored connection state from live evidence on a schedule. List and
// job paths refresh eagerly; abandoned rows otherwise stay on stale "importing"
// forever and inflate sync_health_snapshot until someone opens the app.
export const CONNECTION_STATE_REFRESH_SWEEP_LIMIT = 200;
export const CONNECTION_STATE_REFRESH_STALE_AFTER_MS = 60 * 60 * 1000;

export type ConnectionStateRefreshSweepResult = {
  scanned: number;
  changed: number;
};

export async function refreshStaleConnectionStates(
  deps: ConnectionStateRefreshDeps & {
    connections: ProviderConnectionRepository;
  },
  input: {
    before: Date;
    limit?: number;
    now?: () => Date;
  },
): Promise<ConnectionStateRefreshSweepResult> {
  const limit = input.limit ?? CONNECTION_STATE_REFRESH_SWEEP_LIMIT;
  const now = input.now ?? (() => new Date());
  const importing = await deps.connections.listForDerivedStateRefresh(
    input.before,
    limit,
    { state: "importing" },
  );
  const remaining = Math.max(0, limit - importing.length);
  const rest =
    remaining === 0
      ? []
      : await deps.connections.listForDerivedStateRefresh(
          input.before,
          remaining,
          { excludeState: "importing" },
        );
  const rows = [...importing, ...rest];

  let changed = 0;
  for (const connection of rows) {
    const before = connection.state;
    const beforeReason = connection.stateReason;
    const after = await refreshConnectionState(deps, connection, now);
    if (after.state !== before || after.stateReason !== beforeReason) {
      changed += 1;
    }
  }

  return { scanned: rows.length, changed };
}
