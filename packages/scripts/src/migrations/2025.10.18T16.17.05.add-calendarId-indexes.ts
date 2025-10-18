import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.18T16.17.05.add-calendarId-indexes";
  readonly path: string = "2025.10.18T16.17.05.add-calendarId-indexes.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info("Creating indexes on calendarId field for events");

    try {
      const eventCollection = mongoService.db.collection(Collections.EVENT);

      // Create single index on calendarId for efficient calendar-scoped queries
      await eventCollection.createIndex(
        { calendarId: 1 },
        {
          name: "calendarId_1",
          background: true,
        },
      );

      logger.info("Created index: calendarId_1");

      // Create compound index on user and calendarId for user-calendar-scoped queries
      await eventCollection.createIndex(
        { user: 1, calendarId: 1 },
        {
          name: "user_1_calendarId_1",
          background: true,
        },
      );

      logger.info("Created index: user_1_calendarId_1");

      // Create compound index for date range queries scoped to a calendar
      await eventCollection.createIndex(
        { calendarId: 1, startDate: 1, endDate: 1 },
        {
          name: "calendarId_1_startDate_1_endDate_1",
          background: true,
        },
      );

      logger.info("Created index: calendarId_1_startDate_1_endDate_1");

      logger.info("Successfully created all calendarId indexes");
    } catch (error) {
      logger.error("Failed to create calendarId indexes:", error);
      throw error;
    }
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info("Removing calendarId indexes");

    try {
      const eventCollection = mongoService.db.collection(Collections.EVENT);

      // Drop indexes in reverse order
      await eventCollection.dropIndex("calendarId_1_startDate_1_endDate_1");
      logger.info("Dropped index: calendarId_1_startDate_1_endDate_1");

      await eventCollection.dropIndex("user_1_calendarId_1");
      logger.info("Dropped index: user_1_calendarId_1");

      await eventCollection.dropIndex("calendarId_1");
      logger.info("Dropped index: calendarId_1");

      logger.info("Successfully removed all calendarId indexes");
    } catch (error) {
      logger.error("Failed to remove calendarId indexes:", error);
      throw error;
    }
  }
}
