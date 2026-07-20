import {
  type CreateIndexesOptions,
  type Db,
  type IndexSpecification,
} from "mongodb";
import {
  SYNC_COLLECTIONS,
  type SyncCollectionName,
} from "@sync/storage/collections";

// Declarative index manifests for the `compass_sync` collections (ledger S11),
// drawn from the essential-index table in 01-domain-model.md. Installation is
// idempotent: MongoDB createIndex is a no-op when an identical index already
// exists, so re-running startup never errors. Repositories (S12-S14) rely on
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
      key: { tenantId: 1, principalId: 1, provider: 1, providerAccountId: 1 },
      options: { unique: true },
    },
    { name: "principal_state", key: { principalId: 1, state: 1 } },
    { name: "health_age", key: { lastHealthyAt: 1 } },
  ],
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
      // Sparse: unlinked Compass events have no provider identity.
      options: { unique: true, sparse: true },
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
    { name: "calendar_start", key: { calendarId: 1, "schedule.start": 1 } },
    { name: "principal_start", key: { principalId: 1, "schedule.start": 1 } },
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
  ],
  [SYNC_COLLECTIONS.jobs]: [
    {
      name: "coalescing_key",
      key: { coalescingKey: 1 },
      options: { unique: true },
    },
    {
      name: "state_runafter_priority",
      key: { state: 1, runAfter: 1, priority: -1 },
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
      options: { unique: true },
    },
    // TTL: content-free markers expire 30 days after deletion (R-EVENT-10).
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
