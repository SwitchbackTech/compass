import type { RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { DBEventSchema, Schema_Event } from "@core/types/event.types";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.18T19.43.00.new-events-collection";
  readonly path: string = "2025.10.18T19.43.00.new-events-collection.ts";

  async up(): Promise<void> {
    const collectionName = `${mongoService.event.collectionName}_new`;
    const collection = mongoService.db.collection<Schema_Event>(collectionName);
    const $jsonSchema = zodToMongoSchema(DBEventSchema);

    await mongoService.db.createCollection(collectionName, {
      validator: { $jsonSchema },
      validationLevel: "strict",
    });

    // Create index on user for efficient user-based queries
    await collection.createIndex(
      { calendar: 1 },
      { name: `${collectionName}_calendar_index` },
    );

    await collection.createIndex(
      { calendar: 1, startDate: 1 },
      { name: `${collectionName}_calendar_startDate_index` },
    );

    await collection.createIndex(
      { calendar: 1, endDate: 1 },
      { name: `${collectionName}_calendar_endDate_index` },
    );

    await collection.createIndex(
      { calendar: 1, startDate: 1, endDate: 1 },
      { name: `${collectionName}_calendar_startDate_endDate_index` },
    );

    await collection.createIndex(
      { calendar: 1, isSomeday: 1 },
      { name: `${collectionName}_calendar_isSomeday_index` },
    );

    await collection.createIndex(
      { calendar: 1, "metadata.recurringEventId": 1 },
      {
        name: `${collectionName}_calendar_metadata__recurringEventId_index`,
        sparse: true,
      },
    );

    await collection.createIndex(
      { calendar: 1, "metadata.id": 1 },
      {
        name: `${collectionName}_calendar_metadata__id_unique`,
        unique: true,
        sparse: true,
      },
    );

    await collection.createIndex(
      { calendar: 1, "recurrence.eventId": 1, originalStartDate: 1 },
      {
        name: `${collectionName}_calendar_recurrence__eventId_originalStartDate_unique`,
        unique: true,
        sparse: true,
      },
    );
  }

  async down(): Promise<void> {
    const collectionName = `${mongoService.event.collectionName}_new`;
    const collection = mongoService.db.collection<Schema_Event>(collectionName);

    await collection.drop();
  }
}
