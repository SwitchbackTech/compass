import { backfillBilling } from "@scripts/commands/backfill-billing/backfill";
import { BILLING_PLAN } from "@core/constants/billing.constants";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";

const logger = Logger("scripts.commands.backfill-billing");

function parseArgs(argv: string[]): {
  dryRun: boolean;
  batchSize: number;
  cutoff: Date;
} {
  const cutoffFlag = argv.indexOf("--cutoff");
  const cutoffRaw =
    cutoffFlag >= 0
      ? argv[cutoffFlag + 1]?.trim()
      : BILLING_PLAN.BACKFILL_CUTOFF;
  const cutoff = cutoffRaw
    ? new Date(cutoffRaw)
    : new Date(BILLING_PLAN.BACKFILL_CUTOFF);
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error("backfill-billing --cutoff must be an ISO date");
  }

  const batchFlag = argv.indexOf("--batch-size");
  const batchSize = batchFlag >= 0 ? Number(argv[batchFlag + 1]) : 500;
  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error("backfill-billing --batch-size must be a positive number");
  }

  return { dryRun: !argv.includes("--apply"), batchSize, cutoff };
}

/**
 * Places existing accounts (no billing.subscriptionStatus) into
 * awaiting_checkout. Dry-run by default; pass `--apply` to write.
 *
 * Usage:
 *   bun run cli backfill-billing [--apply] [--batch-size 500] [--cutoff ISO]
 */
export async function runBackfillBilling(): Promise<void> {
  try {
    const { dryRun, batchSize, cutoff } = parseArgs(process.argv.slice(3));
    await mongoService.start();

    logger.info(
      `backfill-billing dryRun=${dryRun} batchSize=${batchSize} cutoff=${cutoff.toISOString()}`,
    );

    const report = await backfillBilling(mongoService.user, {
      dryRun,
      batchSize,
      cutoff,
    });

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    logger.info(
      `backfill-billing dryRun=${report.dryRun} matched=${report.matched} modified=${report.modified}`,
    );

    await mongoService.stop();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
