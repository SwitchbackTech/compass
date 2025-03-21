import { ObjectId } from "mongodb";
import {
  Origin as MockOrigin,
  Priorities as MockPriorities,
} from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
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

// recurrence parent: will have recurrence (rule), but no recurringEventId
// recurrence instance: will have recurrence and recurringEventId

// Mock Google Calendar API responses
jest.mock("googleapis", () => {
  const TEST_EVENT_ID = "test-event-id";
  const mockEvent: gSchema$Event = {
    id: TEST_EVENT_ID,
    summary: "Updated Event",
    status: "confirmed",
    htmlLink: "https://www.google.com/calendar/event?eid=test-event-id",
    created: "2025-03-19T10:32:57.036Z",
    updated: "2025-03-19T10:32:57.036Z",
    start: {
      dateTime: "2025-03-19T14:45:00-05:00",
      timeZone: "America/Chicago",
    },
    end: {
      dateTime: "2025-03-19T16:00:00-05:00",
      timeZone: "America/Chicago",
    },
    iCalUID: "test-event-id@google.com",
    sequence: 0,
    recurrence: ["RRULE:FREQ=DAILY;COUNT=3"],
    recurringEventId: "20250319",
    extendedProperties: {
      private: {
        origin: MockOrigin.GOOGLE_IMPORT,
        priority: MockPriorities.UNASSIGNED,
      },
    },
    reminders: {
      useDefault: true,
    },
    eventType: "default",
  };

  return mockGcal({
    events: [mockEvent],
    nextSyncToken: "new-sync-token",
  });
});

const TEST_EVENT_ID = "test-event-id";

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

  describe("Recurring Events: Existing", () => {
    it("should update one instance when one instance was changed", async () => {
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
    });
    it.todo(
      "should update this and future instances when recurrence rule changed",
    );
    it.todo("should update this and future instances when [TBD]");
  });
  describe("Recurring Events: New", () => {
    it.todo(
      "should import all instances when a new event with a recurrence rule is created",
    );
  });
});
describe("Recurring Events: Existing", () => {
  it.todo("should update one instance when one instance was changed");
  it.todo(
    "should update this and future instances when recurrence rule changed",
  );
  it.todo("should update this and future instances when [TBD]");
});
describe("Recurring Events: New", () => {
  it.todo(
    "should import all instances when a new event with a recurrence rule is created",
  );
});
