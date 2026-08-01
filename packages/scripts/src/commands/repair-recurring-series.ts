import { repairRecurringSeries } from "@scripts/commands/repair-recurring-series/repair";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.repair-recurring-series");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before repair-recurring-series",
    );
  }
  return uri;
}

/**
 * Reproject series masters whose rules carry EXDATE/RDATE lines and remove
 * the orphaned delete-tombstones the now-anchored expansion bug created.
 * Default dry-run; `--apply` writes.
 *
 *   bun run cli repair-recurring-series [--apply]
 */
export async function runRepairRecurringSeries(): Promise<void> {
  const apply = process.argv.slice(3).includes("--apply");
  const syncMongo = new SyncMongoService();
  try {
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });
    const report = await repairRecurringSeries(syncMongo.db, syncMongo.client, {
      dryRun: !apply,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `repair-recurring-series dryRun=${report.dryRun} scanned=${report.mastersScanned} masters=${report.masterIds.length} junk=${report.junkExceptionIds.length} suspectOverrides=${report.suspectOverrideIds.length} unparseable=${report.unparseableMasters}`,
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
