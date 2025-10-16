import type { RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { WatchSchema } from "@core/types/watch.types";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.13T14.18.20.watch-collection";
  readonly path: string = "2025.10.13T14.18.20.watch-collection.ts";

  async up(): Promise<void> {
    const { collectionName } = mongoService.watch;
    const exists = await mongoService.collectionExists(collectionName);
    const $jsonSchema = zodToMongoSchema(WatchSchema);

    if (exists) {
      // do not run in session
      await mongoService.db.command({
        collMod: collectionName,
        validationLevel: "strict",
        validator: { $jsonSchema },
      });
    } else {
      await mongoService.db.createCollection(collectionName, {
        validator: { $jsonSchema },
        validationLevel: "strict",
      });
    }

    // Create index on user for efficient user-based queries
    await mongoService.watch.createIndex(
      { user: 1 },
      { name: `${collectionName}_user_index` },
    );

    await mongoService.watch.createIndex(
      { _id: 1, resourceId: 1 },
      { name: `${collectionName}_channelId_resourceId_index` },
    );

    await mongoService.watch.createIndex(
      { _id: 1, resourceId: 1, expiration: 1 },
      { name: `${collectionName}_channelId_resourceId_expiration_index` },
    );

    // Create a unique compound index on user and gCalendarId
    // to prevent multiple watches for the same calendar per user
    await mongoService.watch.createIndex(
      { user: 1, gCalendarId: 1 },
      { name: `${collectionName}_user_gCalendarId_unique`, unique: true },
    );

    // Create index on expiration for cron cleanup operations
    await mongoService.watch.createIndex(
      { expiration: 1 },
      { name: `${collectionName}_expiration_index` },
    );

    // Create compound index on user and expiration for user cleanup operations
    await mongoService.watch.createIndex(
      { user: 1, expiration: 1 },
      { name: `${collectionName}_user_expiration_index` },
    );
  }

  async down(): Promise<void> {
    // do not drop table, just remove indexes and schema validation
    const { collectionName } = mongoService.watch;
    const exists = await mongoService.collectionExists(collectionName);

    if (!exists) return;

    await mongoService.db.command({
      collMod: collectionName,
      validationLevel: "off",
      validator: {},
    });

    // _id index is built-in, no need to drop
    await mongoService.watch.dropIndex(`${collectionName}_user_index`);

    await mongoService.watch.dropIndex(
      `${collectionName}_channelId_resourceId_index`,
    );

    await mongoService.watch.dropIndex(
      `${collectionName}_channelId_resourceId_expiration_index`,
    );

    await mongoService.watch.dropIndex(
      `${collectionName}_user_gCalendarId_unique`,
    );

    await mongoService.watch.dropIndex(`${collectionName}_expiration_index`);

    await mongoService.watch.dropIndex(
      `${collectionName}_user_expiration_index`,
    );
  }
}
