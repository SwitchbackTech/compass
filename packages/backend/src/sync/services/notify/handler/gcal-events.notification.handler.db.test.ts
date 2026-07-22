import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetEvents = mock();

mock.module("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEvents: mockGetEvents,
  },
}));

const mockLogger = {
  debug: mock(),
  error: mock(),
  info: mock(),
  verbose: mock(),
  warn: mock(),
};

mock.module("@core/logger/winston.logger", () => ({
  __mockLogger: mockLogger,
  Logger: mock(() => mockLogger),
}));

import { ObjectId } from "mongodb";
import { type gCalendar } from "@core/types/gcal";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { GCalEventsNotificationHandler } from "@backend/sync/services/notify/handler/gcal-events.notification.handler";

const getMockLogger = () => mockLogger;

describe("GCalEventsNotificationHandler", () => {
  let handler: GCalEventsNotificationHandler;
  let mockGcal: gCalendar;
  let mockContext: GoogleRequestContext;
  let mockUserId: string;
  let mockCalendarId: string;
  let mockSyncToken: string;
  let calendar: CalendarRecord;

  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);

  beforeEach(() => {
    const logger = getMockLogger();
    logger.debug.mockReset();
    logger.error.mockReset();
    logger.info.mockReset();
    logger.verbose.mockReset();
    logger.warn.mockReset();
    mockGetEvents.mockReset();
  });

  beforeEach(async () => {
    mockUserId = new ObjectId().toString();
    mockCalendarId = "test-calendar-id";
    mockSyncToken = "test-sync-token";

    calendar = {
      _id: new ObjectId(),
      userId: new ObjectId(mockUserId),
      name: "Primary",
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      access: "owner",
      isPrimary: true,
      isVisible: true,
      isActive: true,
      source: {
        provider: "google",
        calendarId: mockCalendarId,
        etag: "etag-1",
      },
      createdAt: new Date(),
      updatedAt: null,
    };
    await mongoService.calendar.insertOne(calendar);

    mockGcal = {
      events: {
        list: mock(),
        get: mock(),
        insert: mock(),
        update: mock(),
        delete: mock(),
        instances: mock(),
      },
    } as unknown as gCalendar;
    mockContext = { gcal: mockGcal, quotaUser: mockUserId };

    handler = new GCalEventsNotificationHandler(
      mockContext,
      mockUserId,
      mockCalendarId,
      mockSyncToken,
    );
  });

  afterAll(cleanupTestDb);

  describe("handleNotification", () => {
    const mockEvents = [
      mockRegularGcalEvent({
        summary: "Standalone Gcal",
      }),
    ];

    it("should process events after changes", async () => {
      mockGetEvents.mockResolvedValue({
        data: { items: mockEvents },
      });

      const result = await handler.handleNotification();

      expect(gcalService.getEvents).toHaveBeenCalledWith(mockContext, {
        calendarId: mockCalendarId,
        syncToken: "test-sync-token",
      });
      expect(result.summary).toEqual("PROCESSED");
      expect(result.calendar?._id.toHexString()).toBe(
        calendar._id.toHexString(),
      );
      expect(result.eventIds.length).toBe(1);
    });

    it("should return IGNORED when no changes found", async () => {
      mockGetEvents.mockResolvedValue({
        data: { items: [] },
      });

      const result = await handler.handleNotification();
      expect(result.summary).toEqual("IGNORED");
    });

    it("should return IGNORED if no changes and nextSyncToken is different", async () => {
      mockGetEvents.mockResolvedValue({
        data: {
          items: [],
          nextSyncToken: "different-token",
        },
      });
      const result = await handler.handleNotification();
      expect(result.summary).toBe("IGNORED");
      expect(result.eventIds).toEqual([]);
    });

    it("should not log the raw Google calendar id when there are no changes to process", async () => {
      mockGetEvents.mockResolvedValue({
        data: { items: [] },
      });

      await handler.handleNotification();

      const logger = getMockLogger();
      const loggedMessages = logger.info.mock.calls.map((call) => call[0]);

      for (const message of loggedMessages) {
        expect(String(message)).not.toContain(mockCalendarId);
      }
    });

    it("should return IGNORED when no owning calendar is found for the user", async () => {
      handler = new GCalEventsNotificationHandler(
        mockContext,
        new ObjectId().toString(),
        mockCalendarId,
        mockSyncToken,
      );
      mockGetEvents.mockResolvedValue({
        data: { items: mockEvents },
      });

      const result = await handler.handleNotification();
      expect(result.summary).toBe("IGNORED");
      expect(result.calendar).toBeNull();
    });
  });
});
