import type { RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { IDSchemaV4 } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.14T12.24.01.update-calendar-schema";
  readonly path: string = "2025.10.14T12.24.01.update-calendar-schema.ts";

  async up(): Promise<void> {
    const { collectionName } = mongoService.calendar;

    const $jsonSchema = zodToMongoSchema(CompassCalendarSchema);

    await mongoService.db.command({
      collMod: collectionName,
      validationLevel: "strict",
      validator: { $jsonSchema },
    });

    await mongoService.calendar.dropIndex(
      `${collectionName}_user_primary_unique`,
    );

    await mongoService.calendar.createIndex(
      { user: 1 },
      { name: `${collectionName}_user_index` },
    );

    await mongoService.calendar.createIndex(
      { user: 1, primary: 1 },
      {
        unique: true,
        name: `${collectionName}_user_primary_unique`,
        partialFilterExpression: { primary: { $eq: true } },
      },
    );
  }

  async down(): Promise<void> {
    const { collectionName } = mongoService.calendar;

    const $jsonSchema = zodToMongoSchema(
      CompassCalendarSchema.extend({
        user: IDSchemaV4,
      }),
    );

    await mongoService.db.command({
      collMod: collectionName,
      validationLevel: "strict",
      validator: { $jsonSchema },
    });

    await mongoService.calendar.dropIndex(`${collectionName}_user_index`);

    await mongoService.calendar.dropIndex(
      `${collectionName}_user_primary_unique`,
    );

    await mongoService.calendar.createIndex(
      { user: 1, primary: 1 },
      { unique: true, name: `${collectionName}_user_primary_unique` },
    );
  }
}
