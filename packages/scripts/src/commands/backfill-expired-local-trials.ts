import { backfillExpiredLocalTrials } from "@scripts/commands/backfill-expired-local-trials/backfill";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";

const logger = Logger("scripts.commands.backfill-expired-local-trials");

function parseArgs(argv: string[]): { dryRun: boolean; batchSize: number } {
  const batchFlag = argv.indexOf("--batch-size");
  const batchSize = batchFlag >= 0 ? Number(argv[batchFlag + 1]) : 500;
  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error(
      "backfill-expired-local-trials --batch-size must be a positive number",
    );
  }

  return { dryRun: !argv.includes("--apply"), batchSize };
}

/**
 * Moves stale card-less local trials off `trialing` after WP-06 removed the
 * signup path. Dry-run by default; pass `--apply` to write.
 *
 * Usage:
 *   bun run cli backfill-expired-local-trials [--apply] [--batch-size 500]
 */
export async function runBackfillExpiredLocalTrials(): Promise<void> {
  try {
    const { dryRun, batchSize } = parseArgs(process.argv.slice(3));
    await mongoService.start();

    logger.info(
      `backfill-expired-local-trials dryRun=${dryRun} batchSize=${batchSize}`,
    );

    const report = await backfillExpiredLocalTrials(mongoService.user, {
      dryRun,
      batchSize,
    });

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    for (const change of report.changes) {
      logger.info(
        `would-update userId=${change.userId} email=${change.email} trialEndsAt=${change.trialEndsAt ?? "null"} ${change.fromStatus}->${change.toStatus}`,
      );
    }
    logger.info(
      `backfill-expired-local-trials dryRun=${report.dryRun} matched=${report.matched} modified=${report.modified}`,
    );

    await mongoService.stop();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
