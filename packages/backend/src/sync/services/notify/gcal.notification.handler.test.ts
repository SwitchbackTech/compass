import { gCalendar } from "@core/types/gcal";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { GCalEventProcessor } from "../process/gcal.event.processor";
import { GCalNotificationHandler } from "./gcal.notification.handler";

// Mock dependencies
jest.mock("../process/gcal.event.processor", () => ({
  GCalEventProcessor: jest.fn().mockImplementation(() => ({
    processEvents: jest.fn(),
  })),
}));

jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEvents: jest.fn(),
  },
}));

jest.mock("@backend/sync/util/sync.queries", () => ({
  getSync: jest.fn(),
}));

describe("GCalNotificationHandler", () => {
  let handler: GCalNotificationHandler;
  let mockGcal: gCalendar;
  let mockUserId: string;
  let mockProcessor: jest.Mocked<GCalEventProcessor>;

  beforeEach(() => {
    mockUserId = "test-user-id";
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

    mockProcessor = {
      processEvents: jest.fn(),
    } as unknown as jest.Mocked<GCalEventProcessor>;
    (GCalEventProcessor as jest.Mock).mockImplementation(() => mockProcessor);

    handler = new GCalNotificationHandler(mockGcal, mockUserId);
  });

  describe("handleNotification", () => {
    const mockPayload = {
      calendarId: "test-calendar-id",
      resourceId: "test-channel-id",
    };

    const mockSync = {
      user: mockUserId,
      google: {
        events: [
          {
            channelId: "test-channel-id",
            gCalendarId: "test-calendar-id",
            nextSyncToken: "test-sync-token",
          },
        ],
      },
    };

    const mockEvents = [
      {
        id: "event-1",
        summary: "Test Event",
        start: { dateTime: "2024-03-20T10:00:00Z" },
        end: { dateTime: "2024-03-20T11:00:00Z" },
      },
    ];

    it("should process events successfully", async () => {
      // Setup
      (getSync as jest.Mock).mockResolvedValue(mockSync);
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: mockEvents },
      });

      // Execute
      await handler.handleNotification(mockPayload);

      // Verify
      expect(getSync).toHaveBeenCalledWith({
        resourceId: mockPayload.resourceId,
      });
      expect(gcalService.getEvents).toHaveBeenCalledWith(mockGcal, {
        calendarId: mockPayload.calendarId,
        syncToken: "test-sync-token",
      });
      expect(mockProcessor.processEvents).toHaveBeenCalledWith(mockEvents);
    });

    it("should throw error when no sync record found", async () => {
      // Setup
      (getSync as jest.Mock).mockResolvedValue(null);

      // Execute and verify
      await expect(handler.handleNotification(mockPayload)).rejects.toEqual(
        error(SyncError.NoSyncRecordForUser, expect.any(String)),
      );
    });

    it("should throw error when no sync token found", async () => {
      // Setup
      (getSync as jest.Mock).mockResolvedValue({
        ...mockSync,
        google: {
          events: [
            {
              channelId: "test-channel-id",
              gCalendarId: "test-calendar-id",
            },
          ],
        },
      });

      // Execute and verify
      await expect(handler.handleNotification(mockPayload)).rejects.toEqual(
        error(SyncError.NoSyncToken, expect.any(String)),
      );
    });

    it("should throw error when no changes found", async () => {
      // Setup
      (getSync as jest.Mock).mockResolvedValue(mockSync);
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: [] },
      });

      // Execute and verify
      await expect(handler.handleNotification(mockPayload)).rejects.toEqual(
        error(SyncError.NoEventChanges, expect.any(String)),
      );
    });
  });
});
