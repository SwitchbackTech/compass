import { gCalendar } from "@core/types/gcal";
import {
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { GCalNotificationHandler } from "./gcal.notification.handler";

// Mock dependencies

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
  let setup: Awaited<ReturnType<typeof setupTestDb>>;
  beforeAll(async () => {
    setup = await setupTestDb();
  });

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

    handler = new GCalNotificationHandler(mockGcal, mockUserId);
  });
  afterAll(async () => {
    await cleanupTestMongo(setup);
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

    it("should process events after changes", async () => {
      // Setup
      (getSync as jest.Mock).mockResolvedValue(mockSync);
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: mockEvents },
      });

      // Execute
      const result = await handler.handleNotification(mockPayload);

      // Verify
      expect(getSync).toHaveBeenCalledWith({
        resourceId: mockPayload.resourceId,
      });
      expect(gcalService.getEvents).toHaveBeenCalledWith(mockGcal, {
        calendarId: mockPayload.calendarId,
        syncToken: "test-sync-token",
      });
      expect(result.summary).toEqual("PROCESSED");
    });

    it("should return IGNORED when no changes found", async () => {
      // Setup
      (getSync as jest.Mock).mockResolvedValue(mockSync);
      (gcalService.getEvents as jest.Mock).mockResolvedValue({
        data: { items: [] },
      });

      // Execute and verify
      const result = await handler.handleNotification(mockPayload);
      expect(result.summary).toEqual("IGNORED");
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
  });
});
