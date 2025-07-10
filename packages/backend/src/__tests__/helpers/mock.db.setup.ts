import { Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Schema_Waitlist } from "../../../../core/src/types/waitlist/waitlist.types";

export interface TestSetup {
  mongoServer: MongoMemoryServer;
  mongoClient: typeof mongoService;
  db: Db;
  userId: string;
  email: string;
}

/**
 * Setup a test database with a test user and a
 * sync record that points to the test user
 * @returns {Promise<TestSetup>} - The test setup object
 */
export async function setupTestDb(): Promise<TestSetup> {
  try {
    const dbName = process.env["DB"];

    // Setup in-memory MongoDB
    const mongoServer = new MongoMemoryServer({ instance: { dbName } });

    await mongoServer.start();
    await mongoService.start(mongoServer.getUri());

    const userId = new ObjectId();
    const userIdStr = userId.toString();
    const email = "test@example.com";

    // test user
    const user: Schema_User & { _id: ObjectId } = {
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

    // sync record for the user
    const syncRecord: Schema_Sync = {
      user: userIdStr,
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

    // Create waitlist user
    const waitlistRecord: Schema_Waitlist = {
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
    };

    await Promise.all([
      mongoService.user.insertOne(user),
      mongoService.sync.insertOne(syncRecord),
      mongoService.waitlist.insertOne(waitlistRecord),
    ]);

    return {
      mongoServer,
      mongoClient: mongoService,
      db: mongoService.db,
      userId: userIdStr,
      email,
    };
  } catch (err) {
    const error = err as Error;

    console.error(
      `test db setup failed with error: ${error.message}`,
      error.stack,
    );

    throw error;
  }
}

export async function cleanupCollections(db: Db): Promise<void> {
  const collections = await db.collections();

  const SKIP_COLLECTIONS = [
    Collections.USER,
    Collections.SYNC,
    Collections.WAITLIST,
  ];

  const selectedCollections = collections.filter(
    (collection) => !SKIP_COLLECTIONS.includes(collection.collectionName),
  );

  await Promise.all(
    selectedCollections.map((collection) => collection.deleteMany()),
  );
}

export async function cleanupTestMongo({
  mongoServer,
  mongoClient,
}: TestSetup): Promise<void> {
  try {
    await mongoClient.stop();
    await mongoServer.stop({ force: true, doCleanup: true });
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}
