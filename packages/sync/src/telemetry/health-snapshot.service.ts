import { type Db } from "mongodb";
import { ConnectionStateSchema } from "@core/types/sync/connection.contracts";
import {
  SYNC_HEALTH_SNAPSHOT_EVENT,
  type SyncHealthSnapshot,
  SyncHealthSnapshotSchema,
} from "@core/types/sync/health.contracts";
import { type StructuredServiceIdentity } from "@sync/service-identity";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";
import {
  captureSafely,
  type PostHogCaptureClient,
} from "@sync/telemetry/posthog-capture";

// Channels expiring within this window count as renewSoon (aligns with the
// subscription maintenance sweep).
export const HEALTH_SUBSCRIPTION_RENEW_BEFORE_MS = 24 * 60 * 60_000;
const FRESHNESS_SLO_MS = 30_000;
// Cap the in-process freshness sample so a huge deployment stays bounded.
const FRESHNESS_SAMPLE_LIMIT = 5_000;

export interface HealthSnapshotDeps {
  mongo: SyncMongoService;
  identity: StructuredServiceIdentity;
  now?: () => Date;
}

// Build one sanitized aggregate snapshot from Sync storage. Pure relative to
// PostHog — callers decide whether to emit.
export async function computeHealthSnapshot(
  deps: HealthSnapshotDeps,
): Promise<SyncHealthSnapshot> {
  const started = Date.now();
  const now = deps.now?.() ?? new Date();
  const db = deps.mongo.db;

  const [connections, jobs, subscriptions, freshness] = await Promise.all([
    countConnectionsByState(db),
    summarizeJobs(db, now),
    summarizeSubscriptions(db, now),
    summarizeFreshness(db, now),
  ]);

  return SyncHealthSnapshotSchema.parse({
    environment: deps.identity.environment,
    execution: deps.identity.execution,
    provider: "google",
    service: "compass-sync",
    connections,
    jobs,
    subscriptions,
    freshness,
    computedAt: now.toISOString(),
    computeMs: Date.now() - started,
  });
}

export async function emitHealthSnapshot(input: {
  deps: HealthSnapshotDeps;
  client: PostHogCaptureClient | null;
}): Promise<SyncHealthSnapshot> {
  const snapshot = await computeHealthSnapshot(input.deps);
  await captureSafely(input.client, {
    event: SYNC_HEALTH_SNAPSHOT_EVENT,
    // One service-level distinct id — never a user id (R-SEC-04).
    distinctId: "compass-sync",
    properties: snapshot as unknown as Record<string, unknown>,
  });
  return snapshot;
}

async function countConnectionsByState(
  db: Db,
): Promise<SyncHealthSnapshot["connections"]> {
  const rows = await db
    .collection(SYNC_COLLECTIONS.providerConnections)
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$state", count: { $sum: 1 } } },
    ])
    .toArray();

  const counts: SyncHealthSnapshot["connections"] = {
    connecting: 0,
    importing: 0,
    catchingUp: 0,
    healthy: 0,
    delayed: 0,
    actionRequired: 0,
    disconnected: 0,
  };
  for (const row of rows) {
    const state = ConnectionStateSchema.safeParse(row._id);
    if (!state.success) continue;
    counts[state.data] = row.count;
  }
  return counts;
}

async function summarizeJobs(
  db: Db,
  now: Date,
): Promise<SyncHealthSnapshot["jobs"]> {
  const collection = db.collection(SYNC_COLLECTIONS.jobs);
  const [pending, claimed, failed, oldestDue] = await Promise.all([
    collection.countDocuments({ state: "pending" }),
    collection.countDocuments({ state: "claimed" }),
    collection.countDocuments({ state: "failed" }),
    collection.findOne(
      {
        $or: [
          { state: "pending", runAfter: { $lte: now } },
          { state: "claimed", leaseExpiresAt: { $lt: now } },
        ],
      },
      { sort: { runAfter: 1 }, projection: { runAfter: 1 } },
    ),
  ]);

  const oldestDueAgeMs =
    oldestDue?.["runAfter"] instanceof Date
      ? Math.max(0, now.getTime() - oldestDue["runAfter"].getTime())
      : null;

  return { pending, claimed, failed, oldestDueAgeMs };
}

async function summarizeSubscriptions(
  db: Db,
  now: Date,
): Promise<SyncHealthSnapshot["subscriptions"]> {
  const renewBefore = new Date(
    now.getTime() + HEALTH_SUBSCRIPTION_RENEW_BEFORE_MS,
  );
  const collection = db.collection(SYNC_COLLECTIONS.syncResources);
  const eventsFilter = { resourceKind: "events" as const };

  const [healthy, renewSoon, expired, missing] = await Promise.all([
    collection.countDocuments({
      ...eventsFilter,
      subscriptionId: { $ne: null },
      subscriptionExpiresAt: { $gte: renewBefore },
    }),
    collection.countDocuments({
      ...eventsFilter,
      subscriptionId: { $ne: null },
      subscriptionExpiresAt: { $gte: now, $lt: renewBefore },
    }),
    collection.countDocuments({
      ...eventsFilter,
      subscriptionId: { $ne: null },
      subscriptionExpiresAt: { $lt: now },
    }),
    collection.countDocuments({
      ...eventsFilter,
      subscriptionId: null,
    }),
  ]);

  return { healthy, renewSoon, expired, missing };
}

async function summarizeFreshness(
  db: Db,
  now: Date,
): Promise<SyncHealthSnapshot["freshness"]> {
  const rows = await db
    .collection(SYNC_COLLECTIONS.syncResources)
    .find(
      { resourceKind: "events", lastSuccessAt: { $ne: null } },
      {
        projection: { lastSuccessAt: 1 },
        limit: FRESHNESS_SAMPLE_LIMIT,
        sort: { lastSuccessAt: 1 },
      },
    )
    .toArray();

  if (rows.length === 0) {
    return {
      sampleSize: 0,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      percentOver30s: null,
    };
  }

  const ages = rows
    .map((row) => {
      const at = row["lastSuccessAt"];
      return at instanceof Date ? now.getTime() - at.getTime() : null;
    })
    .filter((age): age is number => age !== null)
    .map((age) => Math.max(0, age))
    .sort((a, b) => a - b);

  if (ages.length === 0) {
    return {
      sampleSize: 0,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      percentOver30s: null,
    };
  }

  const over30 = ages.filter((age) => age > FRESHNESS_SLO_MS).length;
  return {
    sampleSize: ages.length,
    p50Ms: percentile(ages, 0.5),
    p95Ms: percentile(ages, 0.95),
    p99Ms: percentile(ages, 0.99),
    percentOver30s: Math.round((over30 / ages.length) * 1000) / 10,
  };
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[index]!;
}
