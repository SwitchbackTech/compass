import { repairLegacySeriesWeekday } from "@scripts/commands/repair-legacy-series-weekday/repair";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.repair-legacy-series-weekday");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before repair-legacy-series-weekday",
    );
  }
  return uri;
}

/**
 * One-off repair for weekly recurring series migrated from the legacy DB
 * during the 2026-07-29 Sync cutover whose RRULE BYDAY was captured in the
 * wrong timezone frame relative to schedule.timeZone — causing a phantom,
 * wrong-weekday occurrence to render every week alongside the correct one
 * (which comes from a separately-imported exception holding the real,
 * Google-sourced instant). Rewrites BYDAY to the weekday the series'
 * exceptions actually converge on, and reprojects. See
 * legacy-utc-frame-series-duplicates memory / the migration PR description
 * for the full root-cause writeup. Default dry-run; `--apply` writes.
 *
 *   bun run cli repair-legacy-series-weekday [--apply]
 */
export async function runRepairLegacySeriesWeekday(): Promise<void> {
  const apply = process.argv.slice(3).includes("--apply");
  const syncMongo = new SyncMongoService();
  try {
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });
    const report = await repairLegacySeriesWeekday(
      syncMongo.db,
      syncMongo.client,
      { dryRun: !apply },
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `repair-legacy-series-weekday dryRun=${report.dryRun} scanned=${report.scanned} ` +
        `candidatesConsidered=${report.candidatesConsidered} fixed=${report.fixed} skipped=${report.skipped}`,
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
