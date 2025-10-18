import { ObjectId } from "mongodb";
import Migration from "@scripts/migrations/2025.10.18T16.17.04.add-calendarId-to-events";
import { Logger } from "@core/logger/winston.logger";
import { CalendarProvider } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

const logger = Logger("test:migration:calendarId");

describe("Migration: Add calendarId to events", () => {
  const migration = new Migration();
  const testUserId = new ObjectId();
  const testCalendarId = new ObjectId();
  const testPrimaryCalendarId = new ObjectId();

  beforeAll(async () => {
    await mongoService.start(true);
  });

  afterAll(async () => {
    await mongoService.stop();
  });

  beforeEach(async () => {
    // Clean up collections
    await mongoService.db.collection(Collections.EVENT).deleteMany({});
    await mongoService.db.collection(Collections.CALENDAR).deleteMany({});
  });

  describe("up", () => {
    it("should assign calendarId to Google events based on provider metadata", async () => {
      // Create a Google calendar
      await mongoService.calendar.insertOne({
        _id: testCalendarId,
        user: testUserId,
        backgroundColor: "#ffffff",
        color: "#000000",
        selected: true,
        primary: false,
        createdAt: new Date(),
        metadata: {
          id: "google-calendar-id",
          provider: CalendarProvider.GOOGLE,
          etag: "test-etag",
          summary: "Test Calendar",
          accessRole: "owner" as const,
          primary: false,
          conferenceProperties: {
            allowedConferenceSolutionTypes: ["hangoutsMeet"],
          },
          defaultReminders: [],
        },
      });

      // Create a Google event
      await mongoService.event.insertOne({
        user: testUserId.toString(),
        gEventId: "google-event-id",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-01T01:00:00Z",
        title: "Test Event",
        origin: "google",
        priority: "p1",
        isSomeday: false,
      });

      // Run migration
      await migration.up({
        context: { logger, unsafe: false },
        name: migration.name,
        path: migration.path,
      });

      // Verify the event has the calendarId
      const updatedEvent = await mongoService.event.findOne({
        gEventId: "google-event-id",
      });

      expect(updatedEvent).toBeDefined();
      expect(updatedEvent!.calendarId).toBeDefined();
      expect(updatedEvent!.calendarId!.toString()).toBe(
        testCalendarId.toString(),
      );
    });

    it("should assign calendarId to events without gEventId using primary calendar", async () => {
      // Create a primary calendar
      await mongoService.calendar.insertOne({
        _id: testPrimaryCalendarId,
        user: testUserId,
        backgroundColor: "#ffffff",
        color: "#000000",
        selected: true,
        primary: true,
        createdAt: new Date(),
        metadata: {
          id: "primary-calendar-id",
          provider: CalendarProvider.GOOGLE,
          etag: "test-etag",
          summary: "Primary Calendar",
          accessRole: "owner" as const,
          primary: true,
          conferenceProperties: {
            allowedConferenceSolutionTypes: ["hangoutsMeet"],
          },
          defaultReminders: [],
        },
      });

      // Create a Compass event without gEventId
      await mongoService.event.insertOne({
        user: testUserId.toString(),
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-01T01:00:00Z",
        title: "Compass Event",
        origin: "compass",
        priority: "p1",
        isSomeday: false,
      });

      // Run migration
      await migration.up({
        context: { logger, unsafe: false },
        name: migration.name,
        path: migration.path,
      });

      // Verify the event has the primary calendarId
      const updatedEvent = await mongoService.event.findOne({
        title: "Compass Event",
      });

      expect(updatedEvent).toBeDefined();
      expect(updatedEvent!.calendarId).toBeDefined();
      expect(updatedEvent!.calendarId!.toString()).toBe(
        testPrimaryCalendarId.toString(),
      );
    });

    it("should skip someday events", async () => {
      // Create a someday event
      await mongoService.event.insertOne({
        user: testUserId.toString(),
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-01T01:00:00Z",
        title: "Someday Event",
        origin: "compass",
        priority: "p1",
        isSomeday: true,
      });

      // Run migration
      await migration.up({
        context: { logger, unsafe: false },
        name: migration.name,
        path: migration.path,
      });

      // Verify the someday event does not have a calendarId
      const somedayEvent = await mongoService.event.findOne({
        title: "Someday Event",
      });

      expect(somedayEvent).toBeDefined();
      expect(somedayEvent!.calendarId).toBeUndefined();
    });

    it("should handle events that already have calendarId", async () => {
      // Create an event with calendarId already set
      await mongoService.event.insertOne({
        user: testUserId.toString(),
        calendarId: testCalendarId,
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-01T01:00:00Z",
        title: "Event with calendarId",
        origin: "compass",
        priority: "p1",
        isSomeday: false,
      });

      // Run migration
      await migration.up({
        context: { logger, unsafe: false },
        name: migration.name,
        path: migration.path,
      });

      // Verify the event still has the same calendarId
      const event = await mongoService.event.findOne({
        title: "Event with calendarId",
      });

      expect(event).toBeDefined();
      expect(event!.calendarId!.toString()).toBe(testCalendarId.toString());
    });
  });

  describe("down", () => {
    it("should remove calendarId from all events", async () => {
      // Create events with calendarId
      await mongoService.event.insertMany([
        {
          user: testUserId.toString(),
          calendarId: testCalendarId,
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-01-01T01:00:00Z",
          title: "Event 1",
          origin: "compass",
          priority: "p1",
          isSomeday: false,
        },
        {
          user: testUserId.toString(),
          calendarId: testCalendarId,
          startDate: "2025-01-02T00:00:00Z",
          endDate: "2025-01-02T01:00:00Z",
          title: "Event 2",
          origin: "compass",
          priority: "p2",
          isSomeday: false,
        },
      ]);

      // Run down migration
      await migration.down({
        context: { logger, unsafe: false },
        name: migration.name,
        path: migration.path,
      });

      // Verify all events have no calendarId
      const events = await mongoService.event.find({}).toArray();

      expect(events).toHaveLength(2);
      events.forEach((event) => {
        expect(event.calendarId).toBeUndefined();
      });
    });
  });
});
