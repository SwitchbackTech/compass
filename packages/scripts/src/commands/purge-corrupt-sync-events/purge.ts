import { type Db } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { EventRecordSchema } from "@sync/storage/contracts/event.contracts";

export type PurgeCorruptSyncEventsReport = {
  generatedAt: string;
  dryRun: boolean;
  scanned: number;
  wouldDelete: number;
  deleted: number;
  ids: string[];
  samples: Array<{ id: string; detail: string }>;
};

/**
 * Scan Sync `events` for documents that fail EventRecordSchema (e.g. inverted
 * timed schedules written before parse rejected). Safe to rerun.
 */
export async function purgeCorruptSyncEvents(
  db: Db,
  options: { dryRun: boolean; limit?: number } = { dryRun: true },
): Promise<PurgeCorruptSyncEventsReport> {
  const limit = options.limit ?? Infinity;
  const collection = db.collection(SYNC_COLLECTIONS.events);
  const ids: string[] = [];
  const samples: Array<{ id: string; detail: string }> = [];
  let scanned = 0;
  let deleted = 0;

  const cursor = collection.find({}, { projection: undefined });
  for await (const doc of cursor) {
    scanned += 1;
    const parsed = EventRecordSchema.safeParse(doc);
    if (parsed.success) continue;
    const id = String(doc["_id"]);
    ids.push(id);
    if (samples.length < 20) {
      samples.push({
        id,
        detail: parsed.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
    }
    if (!options.dryRun) {
      await collection.deleteOne({ _id: doc["_id"] });
      deleted += 1;
    }
    if (ids.length >= limit) break;
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    scanned,
    wouldDelete: options.dryRun ? ids.length : 0,
    deleted,
    ids,
    samples,
  };
}
