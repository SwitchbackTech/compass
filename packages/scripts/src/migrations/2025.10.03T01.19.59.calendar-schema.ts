import type { RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { IDSchemaV4 } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.03T01.19.59.calendar-schema";
  readonly path: string = "2025.10.03T01.19.59.calendar-schema.ts";

  static readonly CompassCalendarSchema = CompassCalendarSchema.extend({
    user: IDSchemaV4,
  });

  async up(): Promise<void> {
    const { collectionName } = mongoService.calendar;
    const exists = await mongoService.collectionExists(collectionName);

    const $jsonSchema = zodToMongoSchema(Migration.CompassCalendarSchema);

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

    await mongoService.calendar.createIndex(
      { user: 1, primary: 1 },
      { unique: true, name: `${collectionName}_user_primary_unique` },
    );

    await mongoService.calendar.createIndex(
      { user: 1, "metadata.id": 1, "metadata.provider": 1 },
      {
        unique: true,
        name: `${collectionName}_user_metadata__id_metadata__provider_unique`,
      },
    );

    await mongoService.calendar.createIndex(
      { user: 1, selected: 1 },
      { name: `${collectionName}_user_selected_index` },
    );
  }

  async down(): Promise<void> {
    // do not drop table, just remove indexes and schema validation
    const { collectionName } = mongoService.calendar;
    const exists = await mongoService.collectionExists(collectionName);

    if (!exists) return;

    await mongoService.db.command({
      collMod: collectionName,
      validationLevel: "off",
      validator: {},
    });

    await mongoService.calendar.dropIndex(
      `${collectionName}_user_primary_unique`,
    );

    await mongoService.calendar.dropIndex(
      `${collectionName}_user_metadata__id_metadata__provider_unique`,
    );

    await mongoService.calendar.dropIndex(
      `${collectionName}_user_selected_index`,
    );
  }
}
