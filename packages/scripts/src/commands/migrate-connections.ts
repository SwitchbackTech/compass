import { migrateProviderConnections } from "@scripts/commands/migrate-connections/migrate";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const logger = Logger("scripts.commands.migrate-connections");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before migrating connections",
    );
  }
  return uri;
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  outPath: string | null;
  userIds: Set<string> | undefined;
} {
  const apply = argv.includes("--apply");
  const dryRun = !apply;
  const outFlag = argv.indexOf("--out");
  const outPath =
    outFlag >= 0 && argv[outFlag + 1] ? resolve(argv[outFlag + 1]!) : null;

  const userIds = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--user-id" && argv[i + 1]) {
      userIds.add(argv[i + 1]!);
      i += 1;
    }
  }

  return {
    dryRun,
    outPath,
    userIds: userIds.size > 0 ? userIds : undefined,
  };
}

/**
 * S47: idempotently copy legacy Google connections + refresh tokens into Sync
 * custody. Default is dry-run; pass `--apply` to write. Never clears source
 * credentials, never enqueues Sync jobs, never calls Google.
 *
 * Usage:
 *   bun run cli migrate-connections [--dry-run|--apply] [--out report.json]
 *     [--user-id <id>]...
 */
export async function runMigrateConnections(): Promise<void> {
  const { dryRun, outPath, userIds } = parseArgs(process.argv.slice(3));
  const syncMongo = new SyncMongoService();

  try {
    await mongoService.start();
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const users = await mongoService.user.find({}).toArray();
    const report = await migrateProviderConnections(
      {
        connections: new ProviderConnectionRepository(syncMongo.db),
        credentials: new CredentialRepository(syncMongo.db),
      },
      users,
      { dryRun, userIds },
    );

    try {
      const json = `${JSON.stringify(report, null, 2)}\n`;
      if (outPath) {
        writeFileSync(outPath, json, "utf8");
        logger.info(`Wrote connection migration report to ${outPath}`);
      } else {
        process.stdout.write(json);
      }
    } catch (outputError) {
      logger.error(outputError);
      if (dryRun) {
        throw outputError;
      }
      logger.error(
        "migrate-connections apply completed but report output failed; database changes were persisted",
      );
    }

    logger.info(
      `migrate-connections dryRun=${report.dryRun} scanned=${report.counts.scanned} created=${report.counts.created} updated=${report.counts.updated} skipped=${report.counts.skipped}`,
    );

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
