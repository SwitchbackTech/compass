import { Db, MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Schema_Event } from "@core/types/event.types";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export interface TestSetup {
  mongoServer: MongoMemoryServer;
  mongoClient: MongoClient;
  db: Db;
  userId: string;
  email: string;
}

jest.mock("@backend/common/middleware/supertokens.middleware", () => ({
  initSupertokens: jest.fn(),
  getSession: jest.fn(),
}));

/**
 * Setup a test database with a test user and a
 * sync record that points to the test user
 * @returns {Promise<TestSetup>} - The test setup object
 */
export async function setupTestDb(): Promise<TestSetup> {
  // Setup in-memory MongoDB
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  const mongoClient = await MongoClient.connect(mongoUri);
  const db = mongoClient.db("test-db");

  // Create collections
  await db.createCollection(Collections.USER);
  await db.createCollection(Collections.SYNC);
  await db.createCollection(Collections.EVENT);
  await db.createCollection(Collections.WAITLIST);

  // Setup mongoService mock to use our test collections
  (mongoService as any).db = db;
  (mongoService as any).user = db.collection<Schema_User>(Collections.USER);
  (mongoService as any).sync = db.collection<Schema_Sync>(Collections.SYNC);
  (mongoService as any).event = db.collection<Schema_Event>(Collections.EVENT);
  (mongoService as any).waitlist = db.collection<Schema_Waitlist>(
    Collections.WAITLIST,
  );

  // Create test user
  const userId = new ObjectId();
  const email = "test@example.com";
  const user: Schema_User = {
    //@ts-expect-error - overriding the _id to simulate a pre-populated collection
    _id: userId,
    email,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    locale: "en",
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

  // Create waitlist user
  await mongoService.waitlist.insertOne({
    email,
    schemaVersion: "0",
    source: "other",
    firstName: "Test",
    lastName: "User",
    currentlyPayingFor: ["superhuman", "notion"],
    howClearAboutValues: "not-clear",
    workingTowardsMainGoal: "yes",
    isWillingToShare: false,
    status: "waitlisted",
    waitlistedAt: new Date().toISOString(),
  });

  return { mongoServer, mongoClient, db, userId: userId.toString(), email };
}

export async function cleanupCollections(db: Db): Promise<void> {
  const collections = await db.collections();
  const SKIP_COLLECTIONS = [
    Collections.USER,
    Collections.SYNC,
    Collections.WAITLIST,
  ];

  const clearPromises = collections
    .filter(
      (collection) => !SKIP_COLLECTIONS.includes(collection.collectionName),
    )
    .map((collection) => collection.deleteMany({}));
  await Promise.all(clearPromises);
}

export async function cleanupTestMongo(setup: TestSetup): Promise<void> {
  try {
    await mongoService.cleanup();
    await setup.mongoClient.close(true);
    await setup.mongoServer.stop({ force: true });
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}
