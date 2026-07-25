import { loadInventoryCollections } from "@scripts/commands/inventory-legacy-sync/inventory";
import { migrateProviderSyncState } from "@scripts/commands/migrate-provider-state/migrate";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const logger = Logger("scripts.commands.migrate-provider-state");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before migrating provider state",
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
 * S48: idempotently copy legacy Google calendars, linked events, sync cursors,
 * and watch associations into Sync. Default is dry-run; pass `--apply` to write.
 * Never deletes source rows, never calls Google, never enqueues Sync jobs.
 * Unlinked events are deferred to S49; legacy watches require a Sync rewatch.
 *
 * Usage:
 *   bun run cli migrate-provider-state [--dry-run|--apply] [--out report.json]
 *     [--user-id <id>]...
 */
export async function runMigrateProviderState(): Promise<void> {
  const { dryRun, outPath, userIds } = parseArgs(process.argv.slice(3));
  const syncMongo = new SyncMongoService();

  try {
    await mongoService.start();
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const collections = await loadInventoryCollections(mongoService);
    const report = await migrateProviderSyncState(
      {
        connections: new ProviderConnectionRepository(syncMongo.db),
        calendars: new ProviderCalendarRepository(syncMongo.db),
        events: new EventRepository(syncMongo.db),
        occurrences: new EventOccurrenceRepository(
          syncMongo.db,
          syncMongo.client,
        ),
        resources: new SyncResourceRepository(syncMongo.db),
      },
      collections,
      { dryRun, userIds },
    );

    try {
      const json = `${JSON.stringify(report, null, 2)}\n`;
      if (outPath) {
        writeFileSync(outPath, json, "utf8");
        logger.info(`Wrote provider-state migration report to ${outPath}`);
      } else {
        process.stdout.write(json);
      }
    } catch (outputError) {
      logger.error(outputError);
      if (dryRun) {
        throw outputError;
      }
      logger.error(
        "migrate-provider-state apply completed but report output failed; database changes were persisted",
      );
    }

    logger.info(
      `migrate-provider-state dryRun=${report.dryRun} users=${report.counts.usersScanned} calendars=${report.counts.calendarsCreated + report.counts.calendarsUpdated + report.counts.calendarsWouldCreate + report.counts.calendarsWouldUpdate} events=${report.counts.eventsCreated + report.counts.eventsUpdated + report.counts.eventsWouldCreate + report.counts.eventsWouldUpdate} unlinkedDeferred=${report.counts.unlinkedDeferred} watchesRewatch=${report.counts.watchesSkippedRewatch}`,
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
