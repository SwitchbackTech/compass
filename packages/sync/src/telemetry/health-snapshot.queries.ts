import { SYNC_HEALTH_SNAPSHOT_EVENT } from "@core/types/sync/health.contracts";

// HogQL fixtures for the Sync health dashboard / alerts (S44/S45).
// Wired into PostHog insights from SYNC_HEALTH_DASHBOARD; kept here so the
// event shape and alert predicates stay next to the emitter.
export const SYNC_HEALTH_CONNECTION_DISTRIBUTION_HOGQL = `
SELECT
  timestamp,
  properties.environment,
  toFloat(properties.connections.healthy) AS healthy,
  toFloat(properties.connections.delayed) AS delayed,
  toFloat(properties.connections.actionRequired) AS actionRequired,
  toFloat(properties.connections.disconnected) AS disconnected
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
LIMIT 288
`.trim();

export const SYNC_HEALTH_UNHEALTHY_RATIO_HOGQL = `
SELECT
  timestamp,
  properties.environment,
  if(
    (
      toFloat(properties.connections.connecting) +
      toFloat(properties.connections.importing) +
      toFloat(properties.connections.catchingUp) +
      toFloat(properties.connections.healthy) +
      toFloat(properties.connections.delayed) +
      toFloat(properties.connections.actionRequired) +
      toFloat(properties.connections.disconnected)
    ) = 0,
    0,
    (
      (toFloat(properties.connections.delayed) + toFloat(properties.connections.actionRequired)) * 100.0
    ) / (
      toFloat(properties.connections.connecting) +
      toFloat(properties.connections.importing) +
      toFloat(properties.connections.catchingUp) +
      toFloat(properties.connections.healthy) +
      toFloat(properties.connections.delayed) +
      toFloat(properties.connections.actionRequired) +
      toFloat(properties.connections.disconnected)
    )
  ) AS unhealthyPercent
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
LIMIT 288
`.trim();

export const SYNC_HEALTH_FRESHNESS_HOGQL = `
SELECT
  timestamp,
  toFloat(properties.freshness.p50Ms) AS p50Ms,
  toFloat(properties.freshness.p95Ms) AS p95Ms,
  toFloat(properties.freshness.p99Ms) AS p99Ms,
  toFloat(properties.freshness.percentOver30s) AS percentOver30s
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
`.trim();

export const SYNC_HEALTH_JOB_BACKLOG_HOGQL = `
SELECT
  timestamp,
  properties.environment,
  toFloat(properties.jobs.pending) AS pending,
  toFloat(properties.jobs.claimed) AS claimed,
  toFloat(properties.jobs.failed) AS failed,
  toFloat(properties.jobs.oldestDueAgeMs) AS oldestDueAgeMs
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
LIMIT 288
`.trim();

export const SYNC_HEALTH_SUBSCRIPTION_HOGQL = `
SELECT
  timestamp,
  properties.environment,
  toFloat(properties.subscriptions.healthy) AS healthy,
  toFloat(properties.subscriptions.renewSoon) AS renewSoon,
  toFloat(properties.subscriptions.expired) AS expired,
  toFloat(properties.subscriptions.missing) AS missing
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC
LIMIT 288
`.trim();

export const SYNC_HEALTH_HEARTBEAT_HOGQL = `
SELECT count() AS snapshots
FROM events
WHERE event = '${SYNC_HEALTH_SNAPSHOT_EVENT}'
  AND timestamp > now() - INTERVAL 10 MINUTE
`.trim();
