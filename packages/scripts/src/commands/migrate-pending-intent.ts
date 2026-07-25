import { loadInventoryCollections } from "@scripts/commands/inventory-legacy-sync/inventory";
import { migratePendingCompassIntent } from "@scripts/commands/migrate-pending-intent/migrate";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const logger = Logger("scripts.commands.migrate-pending-intent");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before migrating pending intent",
    );
  }
  return uri;
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  outPath: string | null;
  userIds: Set<string> | undefined;
  targetCalendarId: string | undefined;
  targetGcalId: string | undefined;
} {
  const apply = argv.includes("--apply");
  const dryRun = !apply;
  const outFlag = argv.indexOf("--out");
  const outPath =
    outFlag >= 0 && argv[outFlag + 1] ? resolve(argv[outFlag + 1]!) : null;

  const userIds = new Set<string>();
  let targetCalendarId: string | undefined;
  let targetGcalId: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--user-id" && argv[i + 1]) {
      userIds.add(argv[i + 1]!);
      i += 1;
    } else if (argv[i] === "--target-calendar-id" && argv[i + 1]) {
      targetCalendarId = argv[i + 1]!;
      i += 1;
    } else if (argv[i] === "--target-gcal-id" && argv[i + 1]) {
      targetGcalId = argv[i + 1]!;
      i += 1;
    }
  }

  return {
    dryRun,
    outPath,
    userIds: userIds.size > 0 ? userIds : undefined,
    targetCalendarId,
    targetGcalId,
  };
}

/**
 * S49: preserve unlinked Compass events in Sync and submit resumable backfill
 * create commands for eligible events. Default dry-run; `--apply` writes.
 * Never mirrors already-linked events, never infers target by email, never
 * calls Google, never enqueues Sync jobs.
 *
 * Usage:
 *   bun run cli migrate-pending-intent [--apply] [--out report.json]
 *     [--user-id <id>]... [--target-calendar-id <syncId>]
 *     [--target-gcal-id <providerCalendarId>]
 */
export async function runMigratePendingIntent(): Promise<void> {
  const { dryRun, outPath, userIds, targetCalendarId, targetGcalId } =
    parseArgs(process.argv.slice(3));
  const syncMongo = new SyncMongoService();

  try {
    await mongoService.start();
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const collections = await loadInventoryCollections(mongoService);
    const report = await migratePendingCompassIntent(
      {
        connections: new ProviderConnectionRepository(syncMongo.db),
        calendars: new ProviderCalendarRepository(syncMongo.db),
        events: new EventRepository(syncMongo.db),
        occurrences: new EventOccurrenceRepository(
          syncMongo.db,
          syncMongo.client,
        ),
        commands: new CommandRepository(syncMongo.db),
      },
      {
        users: collections.users,
        calendars: collections.calendars,
        events: collections.events,
      },
      { dryRun, userIds, targetCalendarId, targetGcalId },
    );

    try {
      const json = `${JSON.stringify(report, null, 2)}\n`;
      if (outPath) {
        writeFileSync(outPath, json, "utf8");
        logger.info(`Wrote pending-intent migration report to ${outPath}`);
      } else {
        process.stdout.write(json);
      }
    } catch (outputError) {
      logger.error(outputError);
      if (dryRun) throw outputError;
      logger.error(
        "migrate-pending-intent apply completed but report output failed; database changes were persisted",
      );
    }

    logger.info(
      `migrate-pending-intent dryRun=${report.dryRun} users=${report.counts.usersScanned} events=${report.counts.eventsCreated + report.counts.eventsUpdated + report.counts.eventsWouldCreate + report.counts.eventsWouldUpdate} commands=${report.counts.commandsCreated + report.counts.commandsWouldCreate}`,
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
