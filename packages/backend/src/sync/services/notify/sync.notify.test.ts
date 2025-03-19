import { Db, MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import {
  ACTIONS_SYNC,
  SyncNotificationService,
  WS_RESULT,
} from "./sync.notify";

jest.mock("@backend/common/middleware/supertokens.middleware", () => ({
  initSupertokens: jest.fn(),
  getSession: jest.fn(),
}));

const TEST_EVENT_ID = "test-event-id";
const mockPriority = Priorities.UNASSIGNED;
const mockOrigin = Origin.GOOGLE_IMPORT;

// Mock Google Calendar API responses
jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn().mockImplementation(async () => ({
          data: {
            items: [
              {
                id: TEST_EVENT_ID,
                summary: "Updated Event",
                status: "confirmed",
                htmlLink:
                  "https://www.google.com/calendar/event?eid=test-event-id",
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
                extendedProperties: {
                  private: {
                    origin: mockOrigin,
                    priority: mockPriority,
                  },
                },
                reminders: {
                  useDefault: true,
                },
                eventType: "default",
              },
            ],
            nextSyncToken: "new-sync-token",
          },
        })),
      },
    }),
  },
}));

describe("SyncNotificationService", () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let userId: ObjectId;
  let syncNotifyService: SyncNotificationService;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(mongoUri);
    db = mongoClient.db("test-db");

    await db.createCollection(Collections.USER);
    await db.createCollection(Collections.SYNC);
    await db.createCollection(Collections.EVENT);

    // Setup mongoService mock to use our test collections
    (mongoService as any).db = db;
    (mongoService as any).user = db.collection<Schema_User>(Collections.USER);
    (mongoService as any).sync = db.collection<Schema_Sync>(Collections.SYNC);
    (mongoService as any).event = db.collection<Schema_Event>(
      Collections.EVENT,
    );

    // Create test user in MongoDB
    userId = new ObjectId();
    const user: Schema_User = {
      _id: userId,
      email: "test@example.com",
      google: {
        googleId: "test-google-id",
        picture: "test-picture",
        gRefreshToken: "fake-refresh-token",
      },
    };
    await mongoService.user.insertOne(user);

    // Create sync record for the user
    const syncRecord: Schema_Sync = {
      user: userId.toString(),
      google: {
        calendarlist: [
          {
            gCalendarId: "test-calendar",
            nextSyncToken: "initial-sync-token",
            lastSyncedAt: new Date(),
          },
        ],
        events: [
          {
            gCalendarId: "test-calendar",
            resourceId: "test-resource-id",
            channelId: "test-channel-id",
            expiration: new Date(Date.now() + 3600000).toISOString(),
            nextSyncToken: "initial-sync-token",
          },
        ],
      },
    };
    await mongoService.sync.insertOne(syncRecord);

    syncNotifyService = new SyncNotificationService();
  });

  beforeEach(async () => {
    await mongoService.event.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup
    await mongoClient.close();
    await mongoServer.stop();
  });

  it("should update existing event instead of creating duplicate when receiving notification", async () => {
    // Create initial event in Compass
    const initialEvent: Schema_Event = {
      _id: new ObjectId(),
      user: userId.toString(),
      gEventId: TEST_EVENT_ID,
      title: "Initial Event",
      origin: Origin.COMPASS,
      startDate: new Date("2025-03-19T14:45:00-05:00").toISOString(),
      endDate: new Date("2025-03-19T16:00:00-05:00").toISOString(),
      isAllDay: false,
      isSomeday: false,
      priority: Priorities.UNASSIGNED,
      updatedAt: new Date(),
    };
    await db.collection(Collections.EVENT).insertOne(initialEvent);

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
    const events = await db
      .collection(Collections.EVENT)
      .find({ gEventId: TEST_EVENT_ID })
      .toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeDefined();
    expect(events[0]?.["title"]).toBe("Updated Event");
    expect(events[0]?.["origin"]).toBe(Origin.GOOGLE_IMPORT);
  });
});
