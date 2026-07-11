import { ObjectId } from "mongodb";
import { type gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";

// Mock dependencies

jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEvents: jest.fn(),
  },
}));

describe("GCalNotificationHandler", () => {
  let handler: GCalNotificationHandler;
  let mockGcal: gCalendar;
  let mockUserId: string;
  let mockCalendarId: string;
  let mockSyncToken: string;
  let calendar: CalendarRecord;

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);

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

    handler = new GCalNotificationHandler(
      mockGcal,
      Resource_Sync.EVENTS,
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
      expect(gcalService.getEvents).toHaveBeenCalledWith(mockGcal, {
        calendarId: mockCalendarId,
        syncToken: "test-sync-token",
      });
      expect(result.summary).toEqual("PROCESSED");
      expect(result.calendarId?.toHexString()).toBe(calendar._id.toHexString());
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

    it("should return IGNORED if resource is not EVENTS", async () => {
      handler = new GCalNotificationHandler(
        mockGcal,
        Resource_Sync.SETTINGS, // Not EVENTS
        mockUserId,
        mockCalendarId,
        mockSyncToken,
      );
      const result = await handler.handleNotification();
      expect(result.summary).toBe("IGNORED");
      expect(result.eventIds).toEqual([]);
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

    it("should return IGNORED when no owning calendar is found for the user", async () => {
      handler = new GCalNotificationHandler(
        mockGcal,
        Resource_Sync.EVENTS,
        new ObjectId().toString(),
        mockCalendarId,
        mockSyncToken,
      );
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: mockEvents },
      });

      const result = await handler.handleNotification();
      expect(result.summary).toBe("IGNORED");
      expect(result.calendarId).toBeNull();
    });
  });
});
