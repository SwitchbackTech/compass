import {
  type CreateIndexesOptions,
  type Db,
  type IndexSpecification,
} from "mongodb";
import {
  SYNC_COLLECTIONS,
  type SyncCollectionName,
} from "@sync/storage/collections";

// Declarative index manifests for the `compass_sync` collections,
// drawn from the domain model's essential indexes. Installation is
// idempotent: MongoDB createIndex is a no-op when an identical index already
// exists, so re-running startup never errors. Repositories rely on
// these unique identities for atomic upserts and coalescing.

export interface IndexManifestEntry {
  readonly name: string;
  readonly key: IndexSpecification;
  readonly options?: CreateIndexesOptions;
}

export type IndexManifest = Record<SyncCollectionName, IndexManifestEntry[]>;

export const SYNC_INDEX_MANIFEST: IndexManifest = {
  [SYNC_COLLECTIONS.providerConnections]: [
    {
      name: "provider_account_identity",
      // account.providerAccountId is nested in the record — the index path must
      // match where the field actually lives, or every document keys on null.
      key: {
        tenantId: 1,
        principalId: 1,
        provider: 1,
        "account.providerAccountId": 1,
      },
      options: { unique: true },
    },
    { name: "principal_state", key: { principalId: 1, state: 1 } },
    { name: "health_age", key: { lastHealthyAt: 1 } },
  ],
  // Keyed 1:1 by connection id (the automatic _id index); no secondary indexes.
  [SYNC_COLLECTIONS.credentials]: [],
  [SYNC_COLLECTIONS.providerCalendars]: [
    {
      name: "connection_provider_calendar",
      key: { connectionId: 1, providerCalendarId: 1 },
      options: { unique: true },
    },
    { name: "principal_active", key: { principalId: 1, active: 1 } },
  ],
  [SYNC_COLLECTIONS.events]: [
    {
      name: "provider_event_identity",
      key: { connectionId: 1, calendarId: 1, providerEventId: 1 },
      // partialFilterExpression, not sparse: uniqueness must apply only to
      // genuinely provider-linked events. A sparse index would index an
      // unlinked event stored with providerEventId=null and then collide all
      // such events on (null,null,null) — allowing only one unlinked event.
      // Filtering on a real string providerEventId is robust whether the
      // repository stores unlinked provider fields as null or absent.
      options: {
        unique: true,
        partialFilterExpression: { providerEventId: { $type: "string" } },
      },
    },
    { name: "principal_calendar", key: { principalId: 1, calendarId: 1 } },
    {
      name: "client_event_id",
      key: { principalId: 1, clientEventId: 1 },
      options: { sparse: true },
    },
  ],
  [SYNC_COLLECTIONS.eventOccurrences]: [
    {
      name: "event_occurrence",
      key: { eventId: 1, occurrenceKey: 1 },
      options: { unique: true },
    },
    // Index the normalized start instant (startAt), not the schedule.start
    // union path — range queries compare all-day and timed occurrences on one
    // coherent axis.
    { name: "calendar_start", key: { calendarId: 1, startAt: 1 } },
    { name: "principal_start", key: { principalId: 1, startAt: 1 } },
  ],
  [SYNC_COLLECTIONS.syncResources]: [
    {
      name: "connection_resource_calendar",
      key: { connectionId: 1, resourceKind: 1, calendarId: 1 },
      options: { unique: true },
    },
    {
      name: "subscription_expiry",
      key: { subscriptionExpiresAt: 1 },
      options: { sparse: true },
    },
    {
      // The public notification webhook looks a resource up by its channel id
      // on every inbound callback; sparse because most resources have none.
      name: "subscription_id",
      key: { subscriptionId: 1 },
      options: { sparse: true },
    },
    { name: "last_success", key: { lastSuccessAt: 1 } },
  ],
  [SYNC_COLLECTIONS.commands]: [
    {
      name: "idempotency_key",
      key: { tenantId: 1, principalId: 1, idempotencyKey: 1 },
      options: { unique: true },
    },
    { name: "event_state", key: { eventId: 1, "outcome.state": 1 } },
    { name: "pending_age", key: { createdAt: 1 } },
    // Covers the per-principal nonterminal queue drain (filter on state,
    // ordered oldest-first) so it's an index scan, not a collection scan.
    {
      name: "principal_nonterminal",
      key: { tenantId: 1, principalId: 1, "outcome.state": 1, createdAt: 1 },
    },
  ],
  [SYNC_COLLECTIONS.jobs]: [
    {
      name: "coalescing_key",
      key: { coalescingKey: 1 },
      options: { unique: true },
    },
    {
      // Field order matches the due-job claim: filter on state, then sort by
      // priority (desc) then runAfter (asc), so the claim is served from the
      // index without a blocking in-memory sort.
      name: "state_priority_runafter",
      key: { state: 1, priority: -1, runAfter: 1 },
    },
    {
      name: "lease_expiry",
      key: { leaseExpiresAt: 1 },
      options: { sparse: true },
    },
  ],
  [SYNC_COLLECTIONS.deletionMarkers]: [
    {
      name: "provider_event_identity",
      key: { connectionId: 1, calendarId: 1, providerEventId: 1 },
      // Markers are always provider-linked, but filter on a real providerEventId
      // for the same robustness as the events index (never collide on nulls).
      options: {
        unique: true,
        partialFilterExpression: { providerEventId: { $type: "string" } },
      },
    },
    // TTL: content-free markers expire 30 days after deletion.
    {
      name: "ttl_expiry",
      key: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
};

// Creates every collection and its indexes idempotently. Safe to run on every
// startup and safe to run concurrently across replicas (Mongo serializes
// index/collection creation and treats an identical spec as a no-op).
export async function installIndexManifest(
  db: Db,
  manifest: IndexManifest = SYNC_INDEX_MANIFEST,
): Promise<void> {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    ),
  );

  for (const [collectionName, entries] of Object.entries(manifest)) {
    if (!existing.has(collectionName)) {
      // createCollection races harmlessly across replicas: a NamespaceExists
      // (48) from a concurrent creator is equivalent to success.
      await db
        .createCollection(collectionName)
        .catch((error: { code?: number }) => {
          if (error?.code !== 48) throw error;
        });
    }

    const collection = db.collection(collectionName);
    for (const entry of entries) {
      await collection.createIndex(entry.key, {
        name: entry.name,
        ...entry.options,
      });
    }
  }
}
