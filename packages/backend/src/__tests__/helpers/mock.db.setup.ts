import { Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { SyncDriver } from "../drivers/sync.driver";
import { UserDriver } from "../drivers/user.driver";
import { WaitListDriver } from "../drivers/waitlist.driver";

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

    const user = await UserDriver.createUser();

    await Promise.all([
      SyncDriver.createSync(user, true),
      WaitListDriver.createWaitListRecord(user),
    ]);

    return {
      mongoServer,
      mongoClient: mongoService,
      db: mongoService.db,
      userId: user._id.toString(),
      email: user.email,
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
