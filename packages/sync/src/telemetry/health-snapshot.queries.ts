import { SYNC_HEALTH_SNAPSHOT_EVENT } from "@core/types/sync/health.contracts";

// HogQL fixtures for the Sync health dashboard / alerts (S44 evidence).
// Wired into PostHog insights in S45; kept here so the event shape and
// alert predicates stay next to the emitter.
export const SYNC_HEALTH_CONNECTION_DISTRIBUTION_HOGQL = `
SELECT
  properties.environment,
  properties.connections.healthy,
  properties.connections.delayed,
  properties.connections.actionRequired,
  properties.connections.disconnected
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
LIMIT 288
`.trim();

export const SYNC_HEALTH_FRESHNESS_HOGQL = `
SELECT
  timestamp,
  properties.freshness.p50Ms,
  properties.freshness.p95Ms,
  properties.freshness.p99Ms,
  properties.freshness.percentOver30s
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
`.trim();

export const SYNC_HEALTH_HEARTBEAT_HOGQL = `
SELECT count() AS snapshots
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 10 MINUTE
`.trim();
