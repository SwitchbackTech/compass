import { refreshConnectionStates } from "@scripts/commands/refresh-connection-states/refresh";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.refresh-connection-states");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before refresh-connection-states",
    );
  }
  return uri;
}

/**
 * Re-derive every provider connection's stored state from live evidence, the
 * same derivation `GET /internal/connections` runs on each fetch. Default
 * dry-run; `--apply` persists. Safe to rerun.
 *
 *   bun run cli refresh-connection-states [--apply]
 */
export async function runRefreshConnectionStates(): Promise<void> {
  const apply = process.argv.slice(3).includes("--apply");
  const syncMongo = new SyncMongoService();
  try {
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });
    const report = await refreshConnectionStates(syncMongo.db, {
      dryRun: !apply,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `refresh-connection-states dryRun=${report.dryRun} scanned=${report.scanned} changed=${report.changed}`,
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
