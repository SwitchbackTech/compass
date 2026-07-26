import { loadInventoryCollections } from "@scripts/commands/inventory-legacy-sync/inventory";
import { runPreseedSyncComposition } from "@scripts/commands/preseed-sync/preseed";
import {
  writePreseedFailureMarker,
} from "@scripts/commands/preseed-sync/heartbeat";
import {
  type PreseedMode,
  PreseedModeSchema,
  type PreseedPhase,
  PreseedPhaseSchema,
} from "@scripts/commands/preseed-sync/report.types";
import { type ReprojectMode } from "@scripts/commands/migrate-provider-state/migrate";
import { loadCompassConfig } from "@core/config/compass.config";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { resolve } from "node:path";

const logger = Logger("scripts.commands.preseed-sync");

function syncMongoUri(): string {
  const fromEnv = process.env["SYNC_MONGO_URI"]?.trim();
  if (fromEnv) return fromEnv;
  const uri = loadCompassConfig().sync?.mongoUri?.trim();
  if (!uri) {
    throw new Error(
      "Set SYNC_MONGO_URI or add sync.mongoUri to compass.yaml before preseed-sync",
    );
  }
  return uri;
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  outDir: string | null;
  userIds: Set<string> | undefined;
  mode: PreseedMode;
  phase: PreseedPhase;
  targetCalendarId: string | undefined;
  targetGcalId: string | undefined;
  reproject: ReprojectMode;
  concurrency: number;
  purgeCorrupt: boolean;
} {
  const apply = argv.includes("--apply");
  const dryRun = !apply;
  const outFlag = argv.indexOf("--out");
  const outDir =
    outFlag >= 0 && argv[outFlag + 1] ? resolve(argv[outFlag + 1]!) : null;

  const userIds = new Set<string>();
  let mode: PreseedMode = "live";
  let phase: PreseedPhase = "all";
  let targetCalendarId: string | undefined;
  let targetGcalId: string | undefined;
  let reproject: ReprojectMode = "after";
  let concurrency = 4;
  let purgeCorrupt = true;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--user-id" && argv[i + 1]) {
      userIds.add(argv[i + 1]!);
      i += 1;
    } else if (argv[i] === "--mode" && argv[i + 1]) {
      mode = PreseedModeSchema.parse(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--phase" && argv[i + 1]) {
      phase = PreseedPhaseSchema.parse(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--target-calendar-id" && argv[i + 1]) {
      targetCalendarId = argv[i + 1]!;
      i += 1;
    } else if (argv[i] === "--target-gcal-id" && argv[i + 1]) {
      targetGcalId = argv[i + 1]!;
      i += 1;
    } else if (argv[i] === "--reproject" && argv[i + 1]) {
      const value = argv[i + 1]!;
      if (value !== "inline" && value !== "after" && value !== "off") {
        throw new Error("--reproject must be inline|after|off");
      }
      reproject = value;
      i += 1;
    } else if (argv[i] === "--concurrency" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("--concurrency must be a positive number");
      }
      concurrency = Math.max(1, parsed);
      i += 1;
    } else if (argv[i] === "--no-purge-corrupt") {
      purgeCorrupt = false;
    }
  }

  return {
    dryRun,
    outDir,
    userIds: userIds.size > 0 ? userIds : undefined,
    mode,
    phase,
    targetCalendarId,
    targetGcalId,
    reproject,
    concurrency,
    purgeCorrupt,
  };
}

/**
 * S51: compose S46–S49 into a resumable Sync pre-seed with blocking parity and
 * an immutable execution record. Default dry-run; `--apply` writes Sync only.
 * Never enables workers/callbacks, never deletes source, never calls Google.
 *
 * Usage:
 *   bun run cli preseed-sync [--apply] [--out <dir>] [--mode live|frozen]
 *     [--phase inventory|connections|state|pending|all]
 *     [--user-id <id>]... [--target-calendar-id id] [--target-gcal-id id]
 *     [--reproject after|inline|off] [--concurrency N] [--no-purge-corrupt]
 */
export async function runPreseedSync(): Promise<void> {
  const argv = process.argv.slice(3);
  const {
    dryRun,
    outDir,
    userIds,
    mode,
    phase,
    targetCalendarId,
    targetGcalId,
    reproject,
    concurrency,
    purgeCorrupt,
  } = parseArgs(argv);
  const syncMongo = new SyncMongoService();

  try {
    await mongoService.start();
    await syncMongo.connect({
      uri: syncMongoUri(),
      enforceLeastPrivilege: false,
      forbiddenDatabaseName: "prod_calendar",
    });

    const result = await runPreseedSyncComposition(
      {
        loadCollections: () => loadInventoryCollections(mongoService),
        syncDb: syncMongo.db,
        syncClient: syncMongo.client,
      },
      {
        dryRun,
        mode,
        phase,
        userIds,
        targetCalendarId,
        targetGcalId,
        outDir,
        reproject,
        concurrency,
        purgeCorrupt,
        argv,
        gitSha: process.env["GITHUB_SHA"] ?? process.env["GIT_SHA"] ?? null,
        compassApiMongoDbName: mongoService.db?.databaseName ?? null,
        syncMongoDbName: syncMongo.db.databaseName,
      },
    );

    if (!outDir) {
      process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
    } else {
      logger.info(`Wrote preseed artifacts to ${outDir}`);
    }

    logger.info(
      `preseed-sync dryRun=${result.report.dryRun} mode=${result.report.mode} phase=${result.report.phase} parity.ok=${result.report.parity.ok} blockers=${result.report.parity.blockers.length} warnings=${result.report.parity.warnings.length} exit=${result.exitCode}`,
    );

    await syncMongo.disconnect();
    await mongoService.stop();
    process.exit(result.exitCode);
  } catch (error) {
    logger.error(error);
    if (outDir) {
      try {
        await writePreseedFailureMarker(outDir, {
          exitCode: 1,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { message: String(error) },
        });
      } catch {
        // ignore
      }
    }
    try {
      await syncMongo.disconnect();
    } catch {
      // ignore
    }
    try {
      await mongoService.stop();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}
