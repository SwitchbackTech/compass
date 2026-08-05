import { backfillBootstrapState } from "@scripts/commands/backfill-bootstrap-state/backfill";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("scripts.commands.backfill-bootstrap-state");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before backfill-bootstrap-state",
    );
  }
  return uri;
}

function parseLimit(argv: string[]): number | undefined {
  const flagIndex = argv.indexOf("--limit");
  if (flagIndex === -1) return undefined;
  const raw = argv[flagIndex + 1];
  const limit = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit requires a positive integer");
  }
  return limit;
}

/**
 * Stamp bootstrapState: "ready" onto sync_resources rows written before the
 * field existed. Default dry-run; `--apply` writes; `--limit <n>` caps how
 * many rows one run touches, for a cautious first batch against a real
 * database before trusting the full collection. Safe to rerun.
 *
 *   bun run cli backfill-bootstrap-state [--apply] [--limit <n>]
 */
export async function runBackfillBootstrapState(): Promise<void> {
  const argv = process.argv.slice(3);
  const apply = argv.includes("--apply");
  const limit = parseLimit(argv);
  const syncMongo = new SyncMongoService();
  try {
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });
    const report = await backfillBootstrapState(syncMongo.db, {
      dryRun: !apply,
      ...(limit !== undefined ? { limit } : {}),
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `backfill-bootstrap-state dryRun=${report.dryRun} matched=${report.matched} updated=${report.updated}`,
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
