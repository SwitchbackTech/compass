import { backfillIdentities } from "@scripts/commands/backfill-identities/backfill";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { ensureUserIndexes } from "@backend/user/user-indexes";

const logger = Logger("scripts.commands.backfill-identities");

function parseArgs(argv: string[]): { dryRun: boolean; batchSize: number } {
  const batchFlag = argv.indexOf("--batch-size");
  const batchSize = batchFlag >= 0 ? Number(argv[batchFlag + 1]) : 500;
  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error(
      "backfill-identities --batch-size must be a positive number",
    );
  }

  return { dryRun: !argv.includes("--apply"), batchSize };
}

/**
 * Copies `google.googleId` into `identities[]` for users that still only have
 * the legacy Google slot. Dry-run by default; pass `--apply` to write.
 * Idempotent: a second apply changes nothing.
 *
 * Staging and production runs are a founder task, not this command's job.
 *
 * Usage:
 *   bun run cli backfill-identities [--apply] [--batch-size 500]
 */
export async function runBackfillIdentities(): Promise<void> {
  try {
    const { dryRun, batchSize } = parseArgs(process.argv.slice(3));
    await mongoService.start();
    await ensureUserIndexes();

    logger.info(`backfill-identities dryRun=${dryRun} batchSize=${batchSize}`);

    const report = await backfillIdentities(mongoService.user, {
      dryRun,
      batchSize,
    });

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `backfill-identities dryRun=${report.dryRun} matched=${report.matched} modified=${report.modified}`,
    );

    await mongoService.stop();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
