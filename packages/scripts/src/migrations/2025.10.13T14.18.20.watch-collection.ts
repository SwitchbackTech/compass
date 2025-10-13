import type { RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { WatchSchemaStrict } from "@core/types/watch.types";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.13T14.18.20.watch-collection";
  readonly path: string = "2025.10.13T14.18.20.watch-collection.ts";

  async up(): Promise<void> {
    const { collectionName } = mongoService.watch;
    const exists = await mongoService.collectionExists(collectionName);

    const $jsonSchema = zodToMongoSchema(WatchSchemaStrict);

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

    // _id is unique by default in MongoDB, no need to create explicit index

    // Create index on userId for efficient user-based queries
    await mongoService.watch.createIndex(
      { userId: 1 },
      { name: `${collectionName}_userId_index` },
    );

    // Create compound index on userId and expiration for cleanup operations
    await mongoService.watch.createIndex(
      { userId: 1, expiration: 1 },
      { name: `${collectionName}_userId_expiration_index` },
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
    await mongoService.watch.dropIndex(`${collectionName}_userId_index`);
    await mongoService.watch.dropIndex(
      `${collectionName}_userId_expiration_index`,
    );
  }
}
