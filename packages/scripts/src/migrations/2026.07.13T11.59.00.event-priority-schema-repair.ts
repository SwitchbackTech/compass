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
  readonly name: string = "2026.07.13T11.59.00.event-priority-schema-repair";
  readonly path: string = "2026.07.13T11.59.00.event-priority-schema-repair.ts";

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

    const events = mongoService.db.collection<Document>(collectionName);
    const somedayIds = await events
      .find({ "schedule.kind": "someday" }, { projection: { _id: 1 } })
      .map(({ _id }) => _id)
      .toArray();

    if (somedayIds.length > 0) {
      const archivedCount = await mongoService.db
        .collection<Document>(`${collectionName}_legacy_v1`)
        .countDocuments({ _id: { $in: somedayIds } });
      if (archivedCount !== somedayIds.length) {
        throw new Error(
          `Event priority schema repair found ${somedayIds.length} active Someday document(s), but only ${archivedCount} are preserved in the legacy archive`,
        );
      }
      await events.deleteMany({ _id: { $in: somedayIds } });
    }

    const finalSchema = zodToMongoSchema(EventRecordSchema);
    const transitionalSchema = {
      ...finalSchema,
      properties: { ...finalSchema.properties, priority: {} },
    };

    await mongoService.db.command({
      collMod: collectionName,
      validator: { $jsonSchema: transitionalSchema },
      validationLevel: "strict",
    });

    const result = await events.updateMany(
      { priority: { $exists: true } },
      { $unset: { priority: "" } },
    );

    await mongoService.db.command({
      collMod: collectionName,
      validator: { $jsonSchema: finalSchema },
      validationLevel: "strict",
    });

    logger.info(
      `Event priority schema repair: removed ${somedayIds.length} archived Someday leak(s), updated the validator, and cleared priority from ${result.modifiedCount} active event document(s)`,
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    params.context.logger.info(
      "Down migration is a non-destructive no-op for the event priority schema repair",
    );
    return Promise.resolve();
  }
}
