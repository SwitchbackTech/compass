import {
  inventoryLegacySyncData,
  loadInventoryCollections,
} from "@scripts/commands/inventory-legacy-sync/inventory";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const logger = Logger("scripts.commands.inventory-legacy-sync");

/**
 * S46: read-only inventory of legacy Google sync data in the Compass API DB.
 * Does not write, repair, refresh tokens, or call providers.
 *
 * Usage:
 *   bun run cli inventory-legacy-sync [--out path.json]
 */
export async function runInventoryLegacySync(): Promise<void> {
  const outFlag = process.argv.indexOf("--out");
  const outPath =
    outFlag >= 0 && process.argv[outFlag + 1]
      ? resolve(process.argv[outFlag + 1]!)
      : null;

  try {
    await mongoService.start();
    const collections = await loadInventoryCollections(mongoService);
    const report = inventoryLegacySyncData(collections);
    const json = `${JSON.stringify(report, null, 2)}\n`;

    if (outPath) {
      writeFileSync(outPath, json, "utf8");
      logger.info(`Wrote legacy sync inventory to ${outPath}`);
    } else {
      process.stdout.write(json);
    }

    logger.info(
      `Inventory: scanned=${report.counts.scanned} reportable=${report.counts.reportable} skipped=${report.counts.skipped}`,
    );

    await mongoService.stop();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
