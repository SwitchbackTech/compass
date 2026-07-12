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

// Mock dependencies

jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEvents: jest.fn(),
  },
}));

type MockLoggerModule = {
  __mockLogger: {
    debug: jest.Mock;
    error: jest.Mock;
    info: jest.Mock;
    verbose: jest.Mock;
    warn: jest.Mock;
  };
};

jest.mock("@core/logger/winston.logger", () => {
  const mockLogger: MockLoggerModule["__mockLogger"] = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  };

  return {
    __mockLogger: mockLogger,
    Logger: jest.fn(() => mockLogger),
  };
});

const getMockLogger = () =>
  (jest.requireMock("@core/logger/winston.logger") as MockLoggerModule)
    .__mockLogger;

describe("GCalEventsNotificationHandler", () => {
  let handler: GCalEventsNotificationHandler;
  let mockGcal: gCalendar;
  let mockContext: GoogleRequestContext;
  let mockUserId: string;
  let mockCalendarId: string;
  let mockSyncToken: string;
  let calendar: CalendarRecord;

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);

  beforeEach(() => {
    const mockLogger = getMockLogger();
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockLogger.verbose.mockReset();
    mockLogger.warn.mockReset();
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
        list: jest.fn(),
        get: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        instances: jest.fn(),
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
      // Setup
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: mockEvents },
      });

      // Execute
      const result = await handler.handleNotification();

      // Verify
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
      // Setup
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: [] },
      });

      // Execute and verify
      const result = await handler.handleNotification();
      expect(result.summary).toEqual("IGNORED");
    });

    it("should return IGNORED if no changes and nextSyncToken is different", async () => {
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
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
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: [] },
      });

      await handler.handleNotification();

      const mockLogger = getMockLogger();
      const loggedMessages = mockLogger.info.mock.calls.map((call) => call[0]);

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
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: mockEvents },
      });

      const result = await handler.handleNotification();
      expect(result.summary).toBe("IGNORED");
      expect(result.calendar).toBeNull();
    });
  });
});
