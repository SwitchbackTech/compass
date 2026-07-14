import { type MigrationContext } from "@scripts/common/cli.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { type Document } from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import mongoService from "@backend/common/services/mongo.service";
import { EventRecordSchema } from "@backend/event/event.record";

async function assertCalendarOwnedCollection(
  collectionName: string,
): Promise<void> {
  const info = (await mongoService.db
    .listCollections({ name: collectionName })
    .next()) as Document;
  const options = info["options"] as Document | undefined;
  const validator = options?.["validator"] as Document | undefined;
  const schema = validator?.["$jsonSchema"] as Document | undefined;
  const required = schema?.["required"];
  const hasFinalValidator =
    Array.isArray(required) && required.includes("calendarId");
  const hasFinalRecord = await mongoService.db
    .collection<Document>(collectionName)
    .findOne({ calendarId: { $exists: true } }, { projection: { _id: 1 } });

  if (hasFinalValidator || hasFinalRecord) return;

  throw new Error(
    `Event priority schema repair requires the calendar-owned "${collectionName}" collection; run it after the event collection rename`,
  );
}

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2026.07.14T09.59.00.event-priority-schema-repair";
  readonly path: string = "2026.07.14T09.59.00.event-priority-schema-repair.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const collectionName = mongoService.event.collectionName;
    const exists = await mongoService.db
      .listCollections({ name: collectionName })
      .hasNext();

    if (!exists) {
      logger.info(
        `Event priority schema repair: collection "${collectionName}" is absent`,
      );
      return;
    }

    await assertCalendarOwnedCollection(collectionName);

    await mongoService.db.command({
      collMod: collectionName,
      validator: { $jsonSchema: zodToMongoSchema(EventRecordSchema) },
      validationLevel: "strict",
    });

    const events = mongoService.db.collection<Document>(collectionName);
    const result = await events.updateMany(
      { priority: { $exists: true } },
      { $unset: { priority: "" } },
    );

    logger.info(
      `Event priority schema repair: updated validator and cleared priority from ${result.modifiedCount} active event document(s)`,
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    params.context.logger.info(
      "Down migration is a non-destructive no-op for the event priority schema repair",
    );
    return Promise.resolve();
  }
}
