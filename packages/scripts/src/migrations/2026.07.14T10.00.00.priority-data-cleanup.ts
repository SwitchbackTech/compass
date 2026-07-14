import { IS_DEV } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";
import { type Document } from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import { type MigrationContext } from "@scripts/common/cli.types";

// The standalone priority-CRUD collection was never exposed via
// `Collections` after the feature was removed; its name is reconstructed
// here (matching the removed `Collections.PRIORITY` constant) purely to
// find and drop it.
const priorityCollectionName = IS_DEV ? "_dev.priority" : "priority";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2026.07.14T10.00.00.priority-data-cleanup";
  readonly path: string = "2026.07.14T10.00.00.priority-data-cleanup.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    // The legacy `event` collection (still the production source of truth --
    // see docs/self-hosting/event-migration-runbook.md) has no Mongo-level
    // schema validator, so a leftover `priority` field here is inert, not a
    // write-blocking hazard. This is storage hygiene: strip the field the
    // app hasn't read or written since the priority feature was removed.
    // `event_new` is intentionally NOT touched here -- it is inactive
    // prototype data owned by the sub-calendar v1 migration, fully rebuilt
    // from legacy `event` on every backfill rerun, and will stop carrying
    // `priority` on its own the next time that backfill runs (its transform
    // no longer reads the field).
    const events = mongoService.db.collection<Document>(
      mongoService.event.collectionName,
    );
    const eventResult = await events.updateMany(
      { priority: { $exists: true } },
      { $unset: { priority: "" } },
    );
    logger.info(
      `Priority cleanup: cleared priority field from ${eventResult.modifiedCount} event document(s)`,
    );

    // The standalone priority collection (deleted CRUD feature) is fully
    // orphaned -- every document in it is unreachable dead data. Drop it
    // outright rather than emptying it, matching the drop-a-whole-collection
    // precedent in 2025.10.18T19.43.00.new-events-collection.ts.
    const priorityCollectionExists = await mongoService.db
      .listCollections({ name: priorityCollectionName })
      .hasNext();
    if (priorityCollectionExists) {
      await mongoService.db.collection(priorityCollectionName).drop();
      logger.info(`Priority cleanup: dropped collection "${priorityCollectionName}"`);
    } else {
      logger.info(
        `Priority cleanup: collection "${priorityCollectionName}" already absent`,
      );
    }
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info(
      "Down migration is a non-destructive no-op for the priority data " +
        "cleanup; the removed field and dropped collection are not " +
        "recoverable without a backup, per the runbook",
    );

    return Promise.resolve();
  }
}
