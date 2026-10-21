import { type Db } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";

export interface ReconcileCredentialUsableResult {
  /** sync_resources rows visited (primary-key batches). */
  scanned: number;
  /** Rows whose stored credentialUsable differed from credentials evidence. */
  corrected: number;
}

const DEFAULT_BATCH_SIZE = 500;

// Recompute credentialUsable for every sync_resources row from whether a
// credentials document exists for connectionId. Batched by _id on the primary
// key so each batch examines O(batchSize) resource docs plus one indexed
// credentials find on the batch's distinct connectionIds (examined ≈ scanned
// + unique connections per batch, returned = corrected bulk writes).
export async function reconcileCredentialUsable(
  db: Db,
  options: { batchSize?: number } = {},
): Promise<ReconcileCredentialUsableResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const resources = db.collection(SYNC_COLLECTIONS.syncResources);
  const credentials = db.collection(SYNC_COLLECTIONS.credentials);

  let scanned = 0;
  let corrected = 0;
  let afterId: string | undefined;

  for (;;) {
    const filter: Record<string, unknown> = {};
    if (afterId !== undefined) {
      filter["_id"] = { $gt: afterId };
    }
    const batch = await resources
      .find(filter, {
        projection: { _id: 1, connectionId: 1, credentialUsable: 1 },
        sort: { _id: 1 },
        limit: batchSize,
      })
      .toArray();
    if (batch.length === 0) break;

    scanned += batch.length;
    afterId = String(batch[batch.length - 1]!._id);

    const connectionIds = [
      ...new Set(batch.map((row) => String(row["connectionId"]))),
    ];
    const credentialRows = await credentials
      .find({ _id: { $in: connectionIds } } as Record<string, unknown>, {
        projection: { _id: 1 },
      })
      .toArray();
    const hasCredential = new Set(
      credentialRows.map((row) => String(row["_id"])),
    );

    const now = new Date();
    const writes = batch.flatMap((row) => {
      const desired = hasCredential.has(String(row["connectionId"]));
      const current = row["credentialUsable"] as boolean | undefined;
      if (current === desired) return [];
      return [
        {
          updateOne: {
            filter: { _id: row["_id"] },
            update: {
              $set: { credentialUsable: desired, updatedAt: now },
            },
          },
        },
      ];
    });

    if (writes.length > 0) {
      const result = await resources.bulkWrite(writes, { ordered: false });
      corrected += result.modifiedCount;
    }
  }

  return { scanned, corrected };
}
