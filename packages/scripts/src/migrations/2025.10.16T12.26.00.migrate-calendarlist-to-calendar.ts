import { AnyBulkWriteOperation } from "mongodb";
import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { MapCalendar } from "@core/mappers/map.calendar";
import { Schema_Calendar } from "@core/types/calendar.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { IS_DEV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string =
    "2025.10.16T12.26.00.migrate-calendarlist-to-calendar";
  readonly path: string =
    "2025.10.16T12.26.00.migrate-calendarlist-to-calendar.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const session = await mongoService.startSession();

    logger.info(
      "Starting migration of calendarlist entries to calendar collection",
    );

    try {
      session.startTransaction();

      const calendarListCollection = mongoService.db.collection<{
        user: string;
        google: {
          items: gSchema$CalendarListEntry[];
        };
      }>(IS_DEV ? "_dev.calendarlist" : "calendarlist");

      const bulkInsertOperations: AnyBulkWriteOperation<Schema_Calendar>[] = [];

      // Get all calendarlist documents
      const calendarListDocs = calendarListCollection.find(
        {},
        { session, batchSize: MONGO_BATCH_SIZE },
      );

      // Process each calendarlist document
      for await (const calendarListDoc of calendarListDocs) {
        const { user, google } = calendarListDoc;
        const calendars = (google?.items ?? []).flat();

        if (!calendars.length) {
          logger.warn(
            `No Google calendar items found for user ${user}, skipping`,
          );

          continue;
        }

        // Transform each calendar entry
        for (const calendar of calendars) {
          const document = MapCalendar.gcalToCompass(user, calendar);

          bulkInsertOperations.push({ insertOne: { document } });
        }
      }

      if (bulkInsertOperations.length === 0) {
        logger.info("No calendar entries to migrate, skipping insertion step");

        await session.commitTransaction();
        return;
      }

      const { insertedCount } = await mongoService.calendar.bulkWrite(
        bulkInsertOperations,
        { ordered: false, session },
      );

      await session.commitTransaction();

      logger.info(
        `Migration completed: ${insertedCount} calendar entries migrated`,
      );
    } catch (error) {
      await session.abortTransaction();

      logger.error(
        "Calendarlist migration failed, transaction aborted:",
        error,
      );

      throw error;
    }
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info("Reverting migration: removing migrated calendar entries");

    await mongoService.calendar.deleteMany({});

    logger.info("Reverted migration: all calendar entries removed");
  }
}
