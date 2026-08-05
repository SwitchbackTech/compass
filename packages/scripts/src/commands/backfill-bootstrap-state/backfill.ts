import { type Db } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";

export type BackfillBootstrapStateReport = {
  generatedAt: string;
  dryRun: boolean;
  matched: number;
  updated: number;
  ids: string[];
};

/**
 * Stamp `bootstrapState: "ready"` onto sync_resources rows written before the
 * field existed (currently synthesized at read time by
 * ResourceBootstrapStateSchema's `.default("ready")`). Once every row has an
 * explicit value, that schema default - and the read-time ambiguity it papers
 * over - can be retired.
 *
 * Only touches rows genuinely missing the field; already-migrated or
 * newly-created rows (which always write an explicit bootstrapState) are
 * untouched. Idempotent; safe to rerun.
 */
export async function backfillBootstrapState(
  db: Db,
  options: { dryRun: boolean; limit?: number } = { dryRun: true },
): Promise<BackfillBootstrapStateReport> {
  const limit = options.limit ?? Infinity;
  const collection = db.collection(SYNC_COLLECTIONS.syncResources);
  const filter = { bootstrapState: { $exists: false } };

  const rawIds: unknown[] = [];
  const cursor = collection.find(filter, { projection: { _id: 1 } });
  for await (const doc of cursor) {
    rawIds.push(doc["_id"]);
    if (rawIds.length >= limit) break;
  }

  let updated = 0;
  if (!options.dryRun && rawIds.length > 0) {
    const result = await collection.updateMany(
      { _id: { $in: rawIds as never[] }, ...filter },
      { $set: { bootstrapState: "ready" } },
    );
    updated = result.modifiedCount;
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    matched: rawIds.length,
    updated,
    ids: rawIds.map(String),
  };
}
