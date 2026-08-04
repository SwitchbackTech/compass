import { auditConnectionIdentity } from "@scripts/commands/audit-connection-identity/audit";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.audit-connection-identity");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before audit-connection-identity",
    );
  }
  return uri;
}

/**
 * Reports any connected Google account that is actually another Compass
 * user's sign-in identity - added accounts are meant to be data-only (A2),
 * so this should normally report zero. Read-only; safe to run anytime,
 * including on a schedule.
 *
 *   bun run cli audit-connection-identity
 */
export async function runAuditConnectionIdentity(): Promise<void> {
  const syncMongo = new SyncMongoService();
  try {
    await mongoService.start();
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const report = await auditConnectionIdentity(mongoService.db, syncMongo.db);

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.collisions.length > 0) {
      logger.warn(
        `audit-connection-identity found ${report.collisions.length} collision(s) ` +
          `out of ${report.connectionsChecked} connections checked`,
      );
    } else {
      logger.info(
        `audit-connection-identity clean: ${report.connectionsChecked} connections checked, 0 collisions`,
      );
    }

    await syncMongo.disconnect();
    await mongoService.stop();
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
