import { ObjectId, WithId } from "mongodb";
import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import {
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
  Schema_Calendar,
  Schema_CalendarList,
} from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string =
    "2025.10.16T12.26.00.migrate-calendarlist-to-calendar";
  readonly path: string =
    "2025.10.16T12.26.00.migrate-calendarlist-to-calendar.ts";

  private transformCalendarListEntryToCalendar(
    entry: gSchema$CalendarListEntry,
    userId: string,
  ): WithId<Omit<Schema_Calendar, "_id">> {
    const metadata = GoogleCalendarMetadataSchema.parse({
      ...entry,
      provider: CalendarProvider.GOOGLE,
    });

    return CompassCalendarSchema.parse({
      _id: new ObjectId(),
      user: userId,
      backgroundColor: entry.backgroundColor || "#3f51b5",
      color: entry.foregroundColor || "#ffffff",
      selected: entry.selected ?? true,
      primary: entry.primary ?? false,
      timezone: entry.timeZone || null,
      createdAt: new Date(),
      updatedAt: null,
      metadata,
    });
  }

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info(
      "Starting migration of calendarlist entries to calendar collection",
    );

    // Get all calendarlist documents
    const calendarListDocs = await mongoService.calendarList.find({}).toArray();

    if (calendarListDocs.length === 0) {
      logger.info("No calendarlist entries found to migrate");
      return;
    }

    logger.info(
      `Found ${calendarListDocs.length} calendarlist documents to process`,
    );

    let totalEntriesMigrated = 0;
    let documentsProcessed = 0;

    // Process each calendarlist document
    for (const calendarListDoc of calendarListDocs) {
      try {
        const userId = calendarListDoc.user;
        const googleItems = calendarListDoc.google?.items || [];

        if (!googleItems.length) {
          logger.warn(
            `No Google calendar items found for user ${userId}, skipping`,
          );
          continue;
        }

        const calendarDocuments: Array<WithId<Omit<Schema_Calendar, "_id">>> =
          [];

        // Transform each calendar entry
        for (const item of googleItems) {
          // Skip items that are arrays (nested structure from old mapping)
          if (Array.isArray(item)) {
            // Handle nested structure where items might contain arrays
            for (const nestedItem of item) {
              if (typeof nestedItem === "object" && nestedItem.id) {
                calendarDocuments.push(
                  this.transformCalendarListEntryToCalendar(nestedItem, userId),
                );
              }
            }
          } else if (typeof item === "object" && item.id) {
            calendarDocuments.push(
              this.transformCalendarListEntryToCalendar(item, userId),
            );
          }
        }

        if (calendarDocuments.length > 0) {
          // Check if any calendars already exist for this user to prevent duplicates
          const existingCount = await mongoService.calendar.countDocuments({
            user: userId,
          });

          if (existingCount === 0) {
            const result = await mongoService.calendar.insertMany(
              calendarDocuments,
              { ordered: false },
            );

            totalEntriesMigrated += result.insertedCount;
            logger.info(
              `Migrated ${result.insertedCount} calendar entries for user ${userId}`,
            );
          } else {
            logger.warn(
              `User ${userId} already has ${existingCount} calendar entries, skipping to prevent duplicates`,
            );
          }
        }

        documentsProcessed++;
      } catch (error) {
        logger.error(
          `Error processing calendarlist document for user ${calendarListDoc.user}:`,
          error,
        );
        // Continue processing other documents
      }
    }

    logger.info(
      `Migration completed: ${documentsProcessed} documents processed, ${totalEntriesMigrated} calendar entries migrated`,
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info(
      "Down migration: This migration is non-destructive - no action taken to preserve data integrity",
    );
    logger.info(
      "If you need to remove migrated calendar entries, use the admin interface or manual cleanup",
    );
  }
}
