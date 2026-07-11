import { type MigrationContext } from "@scripts/common/cli.types";
import {
  buildLocalCalendarRecord,
  transformLegacyCalendar,
} from "@scripts/common/legacy-calendar.transform";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import { type Document } from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";

// Legacy index names from the pre-A32 shape (created by the 2025.10.03 and
// 2025.10.14 calendar-schema migrations); dropped defensively before the
// final index set is created. A missing index (already dropped by a prior
// run) is not an error.
const legacyIndexNames = (collectionName: string): string[] => [
  `${collectionName}_user_primary_unique`,
  `${collectionName}_user_metadata__id_metadata__provider_unique`,
  `${collectionName}_user_selected_index`,
  `${collectionName}_user_index`,
];

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2026.07.10T21.00.00.calendar-record-migration";
  readonly path: string = "2026.07.10T21.00.00.calendar-record-migration.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const collectionName = mongoService.calendar.collectionName;
    // The physical `calendar` collection holds both legacy (`user`/
    // `metadata`) and already-migrated (`userId`/`source`) shapes during
    // this scan, so it is accessed untyped here rather than through
    // mongoService.calendar (typed to the legacy Schema_Calendar shape).
    const collection = mongoService.db.collection<Document>(collectionName);
    const session = await mongoService.startSession();

    logger.info("Starting calendar record migration");

    const failures: Array<{ legacyId: string | null; reason: string }> = [];

    // The pre-existing legacy validator and unique indexes (strict
    // CompassCalendarSchema, keyed on `user`/`metadata.*`) would reject or
    // collide on the new-shaped documents this migration writes (every
    // migrated doc has null `user`/`metadata.id` under the old index).
    // Relax the validator and drop the legacy indexes before the
    // transaction so writes succeed; the final strict validator and index
    // set are applied once the new shape has fully landed, below.
    const collectionExistsBeforeWrite = await mongoService.db
      .listCollections({ name: collectionName })
      .hasNext();
    if (collectionExistsBeforeWrite) {
      await mongoService.db.command({
        collMod: collectionName,
        validationLevel: "off",
        validator: {},
      });
      for (const name of legacyIndexNames(collectionName)) {
        try {
          await collection.dropIndex(name);
        } catch {
          // Index absent -- dropping is defensive, not required.
        }
      }
    }

    try {
      session.startTransaction();

      const cursor = collection.find(
        {},
        { session, batchSize: MONGO_BATCH_SIZE },
      );

      let scanned = 0;
      let migrated = 0;
      let alreadyMigrated = 0;

      for await (const doc of cursor) {
        scanned += 1;

        const isNewShape = "userId" in doc && "source" in doc;
        if (isNewShape) {
          const parsed = CalendarRecordSchema.safeParse(doc);
          if (!parsed.success) {
            failures.push({
              legacyId: String(doc["_id"] ?? null),
              reason: "invalidShape",
            });
          } else {
            alreadyMigrated += 1;
          }
          continue;
        }

        const result = transformLegacyCalendar(doc);
        if (!result.ok) {
          failures.push({ legacyId: result.legacyId, reason: result.reason });
          continue;
        }

        await collection.replaceOne({ _id: result.record._id }, result.record, {
          session,
        });
        migrated += 1;
      }

      if (failures.length > 0) {
        await session.abortTransaction();
        throw new Error(
          `Calendar migration aborted: ${failures.length} failure(s): ${JSON.stringify(
            failures,
          )}`,
        );
      }

      // Every user gets exactly one Compass-local calendar (idempotent: skip
      // users that already have one, e.g. on a rerun).
      const now = new Date();
      const userCursor = mongoService.user.find(
        {},
        { session, batchSize: MONGO_BATCH_SIZE },
      );

      let localCalendarsCreated = 0;
      for await (const user of userCursor) {
        const existingLocal = await collection.findOne(
          { userId: user._id, "source.provider": "local" },
          { session },
        );
        if (existingLocal) continue;

        const localCalendar = buildLocalCalendarRecord(user._id, now);
        await collection.insertOne(localCalendar, { session });
        localCalendarsCreated += 1;
      }

      await session.commitTransaction();

      logger.info(
        `Calendar migration committed: scanned=${scanned} migrated=${migrated} ` +
          `alreadyMigrated=${alreadyMigrated} localCalendarsCreated=${localCalendarsCreated}`,
      );
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      logger.error("Calendar record migration failed, transaction aborted");
      throw error;
    } finally {
      await session.endSession();
    }

    // Validator and indexes apply after the document writes commit -- they
    // must reflect the final, already-migrated shape.
    const $jsonSchema = zodToMongoSchema(CalendarRecordSchema);
    const exists = await mongoService.db
      .listCollections({ name: collectionName })
      .hasNext();

    if (exists) {
      await mongoService.db.command({
        collMod: collectionName,
        validator: { $jsonSchema },
        validationLevel: "strict",
      });
    } else {
      await mongoService.db.createCollection(collectionName, {
        validator: { $jsonSchema },
        validationLevel: "strict",
      });
    }

    for (const name of legacyIndexNames(collectionName)) {
      try {
        await collection.dropIndex(name);
      } catch {
        // Index absent (already dropped by a prior run or never created) --
        // dropping is defensive, not required.
      }
    }

    await collection.createIndex({ userId: 1 });
    await collection.createIndex(
      { userId: 1 },
      {
        name: "calendar_userId_local_unique",
        unique: true,
        partialFilterExpression: { "source.provider": "local" },
      },
    );
    await collection.createIndex(
      { userId: 1 },
      {
        name: "calendar_userId_googlePrimary_unique",
        unique: true,
        partialFilterExpression: {
          isPrimary: true,
          "source.provider": "google",
        },
      },
    );
    await collection.createIndex(
      { userId: 1, "source.calendarId": 1 },
      {
        name: "calendar_userId_sourceCalendarId_unique",
        unique: true,
        partialFilterExpression: { "source.provider": "google" },
      },
    );
    await collection.createIndex({ userId: 1, isActive: 1, isVisible: 1 });

    logger.info("Calendar migration validator and indexes applied");
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info(
      "Down migration is a non-destructive no-op for the calendar record " +
        "migration; rollback restores from backup per the runbook",
    );

    return Promise.resolve();
  }
}
