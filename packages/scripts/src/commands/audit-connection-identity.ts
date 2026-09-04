import {
  type AuditConnectionIdentityOptions,
  auditConnectionIdentity,
} from "@scripts/commands/audit-connection-identity/audit";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { ProviderKindSchema } from "@core/types/sync/identity.contracts";
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

export function parseAuditConnectionIdentityArgs(
  argv: string[],
): AuditConnectionIdentityOptions {
  const providerFlag = argv.indexOf("--provider");
  if (providerFlag < 0) {
    return {};
  }
  const raw = argv[providerFlag + 1]?.trim();
  if (!raw) {
    throw new Error("audit-connection-identity --provider requires a value");
  }
  const parsed = ProviderKindSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `audit-connection-identity --provider must be one of ${ProviderKindSchema.options.join(", ")}`,
    );
  }
  return { provider: parsed.data };
}

/**
 * Reports any connected provider account that is actually another Compass
 * user's sign-in identity - added accounts are meant to be data-only (A2),
 * so this should normally report zero. Read-only; safe to run anytime,
 * including on a schedule.
 *
 *   bun run cli audit-connection-identity [--provider google|microsoft|apple]
 */
export async function runAuditConnectionIdentity(): Promise<void> {
  const syncMongo = new SyncMongoService();
  try {
    const options = parseAuditConnectionIdentityArgs(process.argv.slice(3));
    await mongoService.start();
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const report = await auditConnectionIdentity(
      mongoService.db,
      syncMongo.db,
      options,
    );

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
