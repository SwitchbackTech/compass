import { ObjectId } from "mongodb";
import {
  Origin as MockOrigin,
  Priorities as MockPriorities,
} from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { mockGcalEvent } from "@backend/__tests__/factories/gcal.event.factory";
import { mockGcal } from "@backend/__tests__/factories/gcal.factory";
import {
  cleanupTestMongo,
  clearCollections,
  setupTestMongo,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  ACTIONS_SYNC,
  SyncNotificationService,
  WS_RESULT,
} from "./sync.notify";

const TEST_EVENT_ID = "test-event-id";

// Mock Google Calendar API responses
jest.mock("googleapis", () => {
  const mockEvent = mockGcalEvent({
    id: TEST_EVENT_ID,
    summary: "Updated Event",
    extendedProperties: {
      private: {
        origin: MockOrigin.GOOGLE_IMPORT,
        priority: MockPriorities.UNASSIGNED,
      },
    },
  });

  return mockGcal({
    events: [mockEvent],
    nextSyncToken: "new-sync-token",
  });
});

describe("SyncNotificationService", () => {
  let syncNotifyService: SyncNotificationService;
  let setup: Awaited<ReturnType<typeof setupTestMongo>>;

  beforeAll(async () => {
    setup = await setupTestMongo();
    syncNotifyService = new SyncNotificationService();
  });

  beforeEach(async () => {
    await clearCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  describe("Regular Events", () => {
    it("should update existing event instead of creating duplicate when receiving notification", async () => {
      // Create initial event in Compass
      const initialEvent: Schema_Event = {
        _id: new ObjectId(),
        user: setup.userId,
        gEventId: TEST_EVENT_ID,
        title: "Initial Event",
        origin: MockOrigin.COMPASS,
        startDate: new Date("2025-03-19T14:45:00-05:00").toISOString(),
        endDate: new Date("2025-03-19T16:00:00-05:00").toISOString(),
        isAllDay: false,
        isSomeday: false,
        priority: MockPriorities.UNASSIGNED,
        updatedAt: new Date(),
      };
      await mongoService.event.insertOne(initialEvent);

      // Process notification
      const result = await syncNotifyService.handleGcalNotification({
        channelId: "test-channel-id",
        resourceId: "test-resource-id",
        resourceState: "exists",
        expiration: new Date(Date.now() + 3600000).toISOString(),
      });

      // Verify business logic
      expect(result.action).toBe(ACTIONS_SYNC.PROCESSED);
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.wsResult).not.toBe(WS_RESULT.UNPROCESSED);

      // Verify DB state
      const events = await mongoService.event
        .find({ gEventId: TEST_EVENT_ID })
        .toArray();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeDefined();
      expect(events[0]?.["title"]).toBe("Updated Event");
      expect(events[0]?.["origin"]).toBe(MockOrigin.GOOGLE_IMPORT);
    });
  });
});
