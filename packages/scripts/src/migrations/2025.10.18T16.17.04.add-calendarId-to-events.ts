import { AnyBulkWriteOperation, ObjectId } from "mongodb";
import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { CalendarProvider } from "@core/types/event.types";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.18T16.17.04.add-calendarId-to-events";
  readonly path: string = "2025.10.18T16.17.04.add-calendarId-to-events.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const session = await mongoService.startSession();

    logger.info("Starting migration to add calendarId to all events");

    try {
      session.startTransaction();

      const eventCollection = mongoService.db.collection<{
        _id: ObjectId;
        user: string | ObjectId;
        gEventId?: string;
        isSomeday?: boolean;
      }>(Collections.EVENT);

      const bulkUpdateOperations: AnyBulkWriteOperation[] = [];

      // Get all events that don't have a calendarId yet
      const events = eventCollection.find(
        { calendarId: { $exists: false } },
        { session, batchSize: MONGO_BATCH_SIZE },
      );

      let eventsProcessed = 0;
      let eventsWithGoogleCalendar = 0;
      let eventsWithPrimaryCalendar = 0;
      let eventsSkipped = 0;

      // Process each event
      for await (const event of events) {
        eventsProcessed++;

        // Skip someday events as they are managed by Compass, not external calendars
        if (event.isSomeday) {
          eventsSkipped++;
          continue;
        }

        const userId =
          typeof event.user === "string"
            ? new ObjectId(event.user)
            : event.user;

        // For Google calendar events, find the matching calendar by provider metadata
        if (event.gEventId) {
          // Find the Google calendar for this user
          const googleCalendar = await mongoService.calendar.findOne(
            {
              user: userId,
              "metadata.provider": CalendarProvider.GOOGLE,
            },
            { session },
          );

          if (googleCalendar) {
            bulkUpdateOperations.push({
              updateOne: {
                filter: { _id: event._id },
                update: { $set: { calendarId: googleCalendar._id } },
              },
            });
            eventsWithGoogleCalendar++;
            continue;
          }
        }

        // Fallback: assign to user's primary calendar
        const primaryCalendar = await mongoService.calendar.findOne(
          {
            user: userId,
            primary: true,
          },
          { session },
        );

        if (primaryCalendar) {
          bulkUpdateOperations.push({
            updateOne: {
              filter: { _id: event._id },
              update: { $set: { calendarId: primaryCalendar._id } },
            },
          });
          eventsWithPrimaryCalendar++;
        } else {
          // No calendar found for this user - this shouldn't happen in production
          // but we log it for visibility
          logger.warn(
            `No calendar found for user ${userId.toString()}, event ${event._id.toString()} will not get a calendarId`,
          );
          eventsSkipped++;
        }
      }

      if (bulkUpdateOperations.length === 0) {
        logger.info("No events to migrate, skipping update step");
        await session.commitTransaction();
        return;
      }

      const { modifiedCount } = await eventCollection.bulkWrite(
        bulkUpdateOperations,
        { ordered: false, session },
      );

      await session.commitTransaction();

      logger.info(`Migration completed:
        - Total events processed: ${eventsProcessed}
        - Events updated with Google calendar: ${eventsWithGoogleCalendar}
        - Events updated with primary calendar: ${eventsWithPrimaryCalendar}
        - Events skipped (someday or no calendar): ${eventsSkipped}
        - Total modified: ${modifiedCount}
      `);
    } catch (error) {
      await session.abortTransaction();

      logger.error("CalendarId migration failed, transaction aborted:", error);

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info("Reverting migration: removing calendarId from all events");

    const { modifiedCount } = await mongoService.db
      .collection(Collections.EVENT)
      .updateMany({}, { $unset: { calendarId: "" } });

    logger.info(
      `Reverted migration: removed calendarId from ${modifiedCount} events`,
    );
  }
}
