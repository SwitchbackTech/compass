import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import { MigratorType } from "@scripts/common/cli.types";
import Migration from "@scripts/migrations/2025.10.16T12.26.00.migrate-calendarlist-to-calendar";
import { gcalCalendarList } from "@core/__mocks__/v1/calendarlist/gcal.calendarlist";
import { Logger } from "@core/logger/winston.logger";
import {
  CompassCalendarSchema,
  Schema_CalendarList,
} from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.16T12.26.00.migrate-calendarlist-to-calendar", () => {
  const migration = new Migration();

  const migrationContext = {
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
    },
  };

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const createTestCalendarListDoc = (
    userId: string,
    itemsCount = 3,
  ): Schema_CalendarList => {
    // Use actual Google calendar list items from mock data
    const selectedItems = gcalCalendarList.items!.slice(0, itemsCount);

    return {
      user: userId,
      google: {
        items: selectedItems,
      },
    };
  };

  const createNestedCalendarListDoc = (userId: string): Schema_CalendarList => {
    // Test case with nested array structure from old mapping
    const selectedItems = gcalCalendarList.items!.slice(0, 2);

    return {
      user: userId,
      google: {
        items: [selectedItems], // Nested array structure
      },
    };
  };

  describe("up migration", () => {
    it("should migrate primary calendar correctly", async () => {
      const userId = faker.database.mongodbObjectId();

      // Find the primary calendar from test data
      const primaryItem = gcalCalendarList.items!.find((item) => item.primary);
      expect(primaryItem).toBeDefined(); // Ensure test data has a primary calendar

      const calendarListDoc: Schema_CalendarList = {
        user: userId,
        google: {
          items: [primaryItem!],
        },
      };

      // Insert test data
      await mongoService.calendarList.insertOne(calendarListDoc);

      // Run migration
      await migration.up(migrationContext);

      // Verify migration results
      const migratedCalendars = await mongoService.calendar
        .find({ user: userId })
        .toArray();

      expect(migratedCalendars).toHaveLength(1);

      const migratedCalendar = migratedCalendars[0]!;
      expect(migratedCalendar.primary).toBe(true);
      expect(migratedCalendar.metadata.summary).toBe(primaryItem!.summary);
    });

    it("should migrate simple calendarlist entries to calendar collection", async () => {
      const userId = faker.database.mongodbObjectId();
      const calendarListDoc = createTestCalendarListDoc(userId, 2);

      // Insert test data
      await mongoService.calendarList.insertOne(calendarListDoc);

      // Verify initial state
      const initialCalendarCount = await mongoService.calendar.countDocuments({
        user: userId,
      });
      expect(initialCalendarCount).toBe(0);

      // Run migration
      await migration.up(migrationContext);

      // Verify migration results
      const migratedCalendars = await mongoService.calendar
        .find({ user: userId })
        .toArray();

      expect(migratedCalendars).toHaveLength(2);

      // Verify each migrated calendar matches expected schema
      migratedCalendars.forEach((calendar) => {
        expect(() => CompassCalendarSchema.parse(calendar)).not.toThrow();
        expect(calendar.user).toBe(userId);
        expect(calendar.metadata.provider).toBe(CalendarProvider.GOOGLE);
        expect(calendar.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(calendar.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(typeof calendar.selected).toBe("boolean");
        expect(typeof calendar.primary).toBe("boolean");
        expect(calendar.createdAt).toBeInstanceOf(Date);
      });

      // Verify specific calendar data mapping
      const primaryCalendar = migratedCalendars.find((c) => c.primary);

      // The test data only uses first 2 items, check if any are primary
      const firstTwoItems = gcalCalendarList.items!.slice(0, 2);
      const hasPrimary = firstTwoItems.some((item) => item.primary);

      if (hasPrimary) {
        expect(primaryCalendar).toBeDefined();
      } else {
        // If no primary calendar in test data, just verify no primary exists
        expect(primaryCalendar).toBeUndefined();
      }

      // Verify we got calendars with the right summaries
      const summaries = migratedCalendars.map((c) => c.metadata.summary);
      expect(summaries).toContain("Weather");
      expect(summaries).toContain("Holiday & Travel");
    });

    it("should handle nested calendarlist structure", async () => {
      const userId = faker.database.mongodbObjectId();
      const calendarListDoc = createNestedCalendarListDoc(userId);

      // Insert test data
      await mongoService.calendarList.insertOne(calendarListDoc);

      // Run migration
      await migration.up(migrationContext);

      // Verify migration results
      const migratedCalendars = await mongoService.calendar
        .find({ user: userId })
        .toArray();

      expect(migratedCalendars).toHaveLength(2);

      migratedCalendars.forEach((calendar) => {
        expect(() => CompassCalendarSchema.parse(calendar)).not.toThrow();
        expect(calendar.user).toBe(userId);
      });
    });

    it("should handle multiple users", async () => {
      const user1Id = faker.database.mongodbObjectId();
      const user2Id = faker.database.mongodbObjectId();

      const calendarListDoc1 = createTestCalendarListDoc(user1Id, 1);
      const calendarListDoc2 = createTestCalendarListDoc(user2Id, 2);

      // Insert test data for multiple users
      await mongoService.calendarList.insertMany([
        calendarListDoc1,
        calendarListDoc2,
      ]);

      // Run migration
      await migration.up(migrationContext);

      // Verify results for each user
      const user1Calendars = await mongoService.calendar
        .find({ user: user1Id })
        .toArray();
      const user2Calendars = await mongoService.calendar
        .find({ user: user2Id })
        .toArray();

      expect(user1Calendars).toHaveLength(1);
      expect(user2Calendars).toHaveLength(2);
    });

    it("should skip users who already have calendar entries", async () => {
      const userId = faker.database.mongodbObjectId();
      const calendarListDoc = createTestCalendarListDoc(userId, 1);

      // Pre-populate calendar collection for this user
      const existingCalendar = CompassCalendarSchema.parse({
        _id: new ObjectId(),
        user: userId,
        backgroundColor: "#ff0000",
        color: "#ffffff",
        selected: true,
        primary: false,
        timezone: "UTC",
        createdAt: new Date(),
        updatedAt: null,
        metadata: {
          id: "existing@example.com",
          provider: CalendarProvider.GOOGLE,
          etag: "test-etag",
          summary: "Existing Calendar",
          accessRole: "owner",
          conferenceProperties: {
            allowedConferenceSolutionTypes: ["hangoutsMeet"],
          },
          defaultReminders: [],
        },
      });

      await mongoService.calendar.insertOne(existingCalendar);
      await mongoService.calendarList.insertOne(calendarListDoc);

      const initialCount = await mongoService.calendar.countDocuments({
        user: userId,
      });
      expect(initialCount).toBe(1);

      // Run migration
      await migration.up(migrationContext);

      // Should not have added new calendars
      const finalCount = await mongoService.calendar.countDocuments({
        user: userId,
      });
      expect(finalCount).toBe(1);
    });

    it("should handle empty calendarlist documents gracefully", async () => {
      const userId = faker.database.mongodbObjectId();

      // Insert calendarlist with no items
      await mongoService.calendarList.insertOne({
        user: userId,
        google: { items: [] },
      });

      // Run migration
      await migration.up(migrationContext);

      // Should not create any calendar entries
      const calendars = await mongoService.calendar
        .find({ user: userId })
        .toArray();
      expect(calendars).toHaveLength(0);
    });

    it("should handle no calendarlist documents", async () => {
      // Run migration with empty calendarlist collection
      await expect(migration.up(migrationContext)).resolves.not.toThrow();

      const totalCalendars = await mongoService.calendar.countDocuments({});
      expect(totalCalendars).toBe(0);
    });

    it("should preserve Google calendar metadata", async () => {
      const userId = faker.database.mongodbObjectId();
      const calendarListDoc = createTestCalendarListDoc(userId, 1);

      await mongoService.calendarList.insertOne(calendarListDoc);

      // Run migration
      await migration.up(migrationContext);

      const migratedCalendar = await mongoService.calendar.findOne({
        user: userId,
      });

      expect(migratedCalendar).toBeDefined();
      expect(migratedCalendar!.metadata.id).toBe(
        gcalCalendarList.items![0]!.id,
      );
      expect(migratedCalendar!.metadata.summary).toBe(
        gcalCalendarList.items![0]!.summary,
      );
      expect(migratedCalendar!.metadata.accessRole).toBe(
        gcalCalendarList.items![0]!.accessRole,
      );
      expect(migratedCalendar!.backgroundColor).toBe(
        gcalCalendarList.items![0]!.backgroundColor,
      );
    });
  });

  describe("down migration", () => {
    it("should not modify any data (non-destructive)", async () => {
      const userId = faker.database.mongodbObjectId();

      // Create some test data
      const existingCalendar = CompassCalendarSchema.parse({
        _id: new ObjectId(),
        user: userId,
        backgroundColor: "#ff0000",
        color: "#ffffff",
        selected: true,
        primary: false,
        timezone: "UTC",
        createdAt: new Date(),
        updatedAt: null,
        metadata: {
          id: "test@example.com",
          provider: CalendarProvider.GOOGLE,
          etag: "test-etag",
          summary: "Test Calendar",
          accessRole: "owner",
          conferenceProperties: {
            allowedConferenceSolutionTypes: ["hangoutsMeet"],
          },
          defaultReminders: [],
        },
      });

      await mongoService.calendar.insertOne(existingCalendar);

      const beforeCount = await mongoService.calendar.countDocuments({
        user: userId,
      });

      // Run down migration
      await migration.down(migrationContext);

      const afterCount = await mongoService.calendar.countDocuments({
        user: userId,
      });

      // Should not have changed anything
      expect(afterCount).toBe(beforeCount);
    });
  });
});
