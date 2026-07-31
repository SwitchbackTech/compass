import { purgeCorruptSyncEvents } from "@scripts/commands/purge-corrupt-sync-events/purge";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.purge-corrupt-sync-events");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before purge-corrupt-sync-events",
    );
  }
  return uri;
}

/**
 * Remove Sync event docs that fail EventRecordSchema (poison from aborted
 * migrate upserts). Default dry-run; `--apply` deletes.
 *
 *   bun run cli purge-corrupt-sync-events [--apply]
 */
export async function runPurgeCorruptSyncEvents(): Promise<void> {
  const apply = process.argv.slice(3).includes("--apply");
  const syncMongo = new SyncMongoService();
  try {
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });
    const report = await purgeCorruptSyncEvents(syncMongo.db, {
      dryRun: !apply,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `purge-corrupt-sync-events dryRun=${report.dryRun} scanned=${report.scanned} deleted=${report.deleted} wouldDelete=${report.wouldDelete}`,
    );
    await syncMongo.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    try {
      await syncMongo.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}
