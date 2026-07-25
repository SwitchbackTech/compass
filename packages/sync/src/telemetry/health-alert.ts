import { type SyncHealthConnectionCounts } from "@core/types/sync/health.contracts";

// R-OPS-03: more than 1% unhealthy for two consecutive reporting windows.
export const UNHEALTHY_CONNECTION_ALERT_PERCENT = 1;

// Unhealthy = delayed + actionRequired (user-visible problems). Disconnected
// is intentional and excluded from the ratio denominator's "problem" side.
export function unhealthyConnectionPercent(
  connections: SyncHealthConnectionCounts,
): number {
  const total =
    connections.connecting +
    connections.importing +
    connections.catchingUp +
    connections.healthy +
    connections.delayed +
    connections.actionRequired +
    connections.disconnected;
  if (total === 0) return 0;
  const unhealthy = connections.delayed + connections.actionRequired;
  return (unhealthy * 100) / total;
}

export function isUnhealthyConnectionAlert(
  windows: readonly SyncHealthConnectionCounts[],
): boolean {
  if (windows.length < 2) return false;
  const lastTwo = windows.slice(-2);
  return lastTwo.every(
    (window) =>
      unhealthyConnectionPercent(window) > UNHEALTHY_CONNECTION_ALERT_PERCENT,
  );
}
