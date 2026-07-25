import { z } from "zod/v4";
import { DateTimeSchema } from "@core/types/domain-primitives";

// Sanitized, bounded-cardinality sync health snapshot (R-OPS / S44).
// Emitted as `sync_health_snapshot` every five minutes. Counts and ages only —
// never tokens, event content, tenant/principal ids, or raw provider errors.
export const SyncHealthConnectionCountsSchema = z.strictObject({
  connecting: z.number().int().nonnegative(),
  importing: z.number().int().nonnegative(),
  catchingUp: z.number().int().nonnegative(),
  healthy: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative(),
  actionRequired: z.number().int().nonnegative(),
  disconnected: z.number().int().nonnegative(),
});
export type SyncHealthConnectionCounts = z.infer<
  typeof SyncHealthConnectionCountsSchema
>;

export const SyncHealthJobBacklogSchema = z.strictObject({
  pending: z.number().int().nonnegative(),
  claimed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  // Age of the oldest due pending/claimed-expired job, or null when none due.
  oldestDueAgeMs: z.number().int().nonnegative().nullable(),
});
export type SyncHealthJobBacklog = z.infer<typeof SyncHealthJobBacklogSchema>;

export const SyncHealthSubscriptionCountsSchema = z.strictObject({
  healthy: z.number().int().nonnegative(),
  renewSoon: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
});
export type SyncHealthSubscriptionCounts = z.infer<
  typeof SyncHealthSubscriptionCountsSchema
>;

export const SyncHealthFreshnessSchema = z.strictObject({
  sampleSize: z.number().int().nonnegative(),
  p50Ms: z.number().int().nonnegative().nullable(),
  p95Ms: z.number().int().nonnegative().nullable(),
  p99Ms: z.number().int().nonnegative().nullable(),
  // Share of sampled events resources whose last success is older than 30s.
  percentOver30s: z.number().min(0).max(100).nullable(),
});
export type SyncHealthFreshness = z.infer<typeof SyncHealthFreshnessSchema>;

export const SyncHealthSnapshotSchema = z.strictObject({
  environment: z.string().min(1),
  execution: z.enum(["passive", "active"]),
  provider: z.literal("google"),
  service: z.literal("compass-sync"),
  connections: SyncHealthConnectionCountsSchema,
  jobs: SyncHealthJobBacklogSchema,
  subscriptions: SyncHealthSubscriptionCountsSchema,
  freshness: SyncHealthFreshnessSchema,
  computedAt: DateTimeSchema,
  computeMs: z.number().int().nonnegative(),
});
export type SyncHealthSnapshot = z.infer<typeof SyncHealthSnapshotSchema>;

export const SYNC_HEALTH_SNAPSHOT_EVENT = "sync_health_snapshot" as const;
