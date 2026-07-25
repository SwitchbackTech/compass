import {
  SYNC_HEALTH_CONNECTION_DISTRIBUTION_HOGQL,
  SYNC_HEALTH_FRESHNESS_HOGQL,
  SYNC_HEALTH_HEARTBEAT_HOGQL,
  SYNC_HEALTH_JOB_BACKLOG_HOGQL,
  SYNC_HEALTH_SUBSCRIPTION_HOGQL,
  SYNC_HEALTH_UNHEALTHY_RATIO_HOGQL,
} from "@sync/telemetry/health-snapshot.queries";

// As-code definition of the single Sync health dashboard (R-OPS-01 / S45).
// Wire these HogQL fixtures into PostHog insights + alerts in the Compass
// PostHog project; this module is the source of truth for panel names/queries.
export const SYNC_HEALTH_DASHBOARD = {
  name: "Sync health",
  description:
    "Primary Sync operating view: connection state, freshness, backlog, subscriptions, and snapshot heartbeat.",
  panels: [
    {
      name: "Connection state distribution",
      query: SYNC_HEALTH_CONNECTION_DISTRIBUTION_HOGQL,
      decision: "Is the system broadly healthy?",
    },
    {
      name: "Unhealthy connection ratio",
      query: SYNC_HEALTH_UNHEALTHY_RATIO_HOGQL,
      decision: "Alert when >1% for two consecutive windows",
    },
    {
      name: "Freshness percentiles",
      query: SYNC_HEALTH_FRESHNESS_HOGQL,
      decision: "Are users seeing current data?",
    },
    {
      name: "Job backlog",
      query: SYNC_HEALTH_JOB_BACKLOG_HOGQL,
      decision: "Is capacity or throttling the limit?",
    },
    {
      name: "Subscription health",
      query: SYNC_HEALTH_SUBSCRIPTION_HOGQL,
      decision: "Will push delivery remain alive?",
    },
    {
      name: "Snapshot heartbeat",
      query: SYNC_HEALTH_HEARTBEAT_HOGQL,
      decision: "Is telemetry itself alive?",
    },
  ],
  alerts: [
    {
      name: "Sync unhealthy connections >1%",
      query: SYNC_HEALTH_UNHEALTHY_RATIO_HOGQL,
      condition: "ratio > 1 for two consecutive 5-minute windows",
    },
    {
      name: "Sync health snapshot missing",
      query: SYNC_HEALTH_HEARTBEAT_HOGQL,
      condition: "snapshots == 0 over 10 minutes",
    },
  ],
} as const;
