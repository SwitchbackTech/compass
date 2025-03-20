import { Db, MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Schema_Event } from "@core/types/event.types";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { generateGcalEvents } from "@backend/__tests__/factories/event.factory";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { SyncImport, createSyncImport } from "./sync.import";

const { gcalEvents: mockGcalEvents, totals } = generateGcalEvents();

jest.mock("googleapis-common", () => ({
  GaxiosError: class GaxiosError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GaxiosError";
    }
  },
}));

// Override gcal API responses with our mock data
jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn().mockImplementation(async (params: any) => {
          const { pageToken } = params;
          const startIndex = pageToken ? parseInt(pageToken) : 0;
          const pageSize = 3;
          const endIndex = startIndex + pageSize;
          const events = mockGcalEvents.slice(startIndex, endIndex);
          const hasMore = endIndex < mockGcalEvents.length;

          return {
            data: {
              items: events,
              nextPageToken: hasMore ? endIndex.toString() : undefined,
              nextSyncToken: hasMore ? undefined : "final-sync-token",
            },
          };
        }),
        // TODO: Enable this when mocking instances during recurring event import
        // instances: jest.fn().mockImplementation(async (params: any) => {
        //   const eventId = params.eventId;
        //   const instances = Array(3)
        //     .fill(null)
        //     .map(() => ({
        //       ...mockGenerateRecurringEvent(),
        //       recurringEventId: eventId,
        //     }));

        //   return {
        //     data: {
        //       items: instances,
        //     },
        //   };
        // }),
      },
      calendarList: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: "test-calendar",
                primary: true,
                summary: "Test Calendar",
              },
            ],
            nextSyncToken: "calendar-list-sync-token",
          },
        }),
      },
    }),
  },
}));

jest.mock("@backend/common/middleware/supertokens.middleware", () => ({
  initSupertokens: jest.fn(),
  getSession: jest.fn(),
}));

describe("SyncImport", () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let syncImport: SyncImport;
  const testUser = new ObjectId().toString();

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(mongoUri);
    db = mongoClient.db("test-db");

    // Setup mongoService mock to use our test db
    (mongoService as any).db = db;
    (mongoService as any).user = db.collection<Schema_User>(Collections.USER);
    (mongoService as any).sync = db.collection<Schema_Sync>(Collections.SYNC);

    // Create test user in MongoDB
    await db.collection(Collections.USER).insertOne({
      _id: new ObjectId(testUser),
      email: "test@example.com",
      google: {
        email: "test@example.com",
        accessToken: "fake-access-token",
        refreshToken: "fake-refresh-token",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      },
    });

    // Create sync record for the user
    await db.collection(Collections.SYNC).insertOne({
      user: testUser,
      google: {
        calendarlist: [],
        events: [],
      },
    });

    syncImport = await createSyncImport(testUser);
  });

  beforeEach(async () => {
    // Clear collections except users before each test
    const collections = await db.collections();
    const clearPromises = collections
      .filter((collection) => collection.collectionName !== "users")
      .map((collection) => collection.deleteMany({}));
    await Promise.all(clearPromises);
  });

  afterAll(async () => {
    // Cleanup
    await mongoService.cleanup();
    await mongoClient.close();
    await mongoServer.stop();
  });

  describe("Full import", () => {
    it("should include regular and recurring events and skip cancelled events", async () => {
      const { total: totalProcessed, nextSyncToken } =
        await syncImport.importAllEvents(testUser, "test-calendar");

      const currentEventsInDb = await db
        .collection<Schema_Event>(Collections.EVENT)
        .find()
        .toArray();

      // Ensure all available gcal events were processed
      expect(totalProcessed).toEqual(totals.total);

      // Ensure cancelled events were not imported
      expect(currentEventsInDb).toHaveLength(totals.total - totals.cancelled);

      // Ensures recurring events were imported
      const recurringEvents = currentEventsInDb.filter(
        (e) => e.recurrence !== undefined,
      );
      expect(recurringEvents).toHaveLength(totals.recurring);

      // Incremental imports need this token, so make sure it's present
      expect(nextSyncToken).toBe("final-sync-token");
    });
  });
});
