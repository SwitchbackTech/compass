import { Db } from "mongodb";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { WaitListDriver } from "@backend/__tests__/drivers/waitlist.driver";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export interface TestSetup {
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
    await mongoService.start();

    const user = await UserDriver.createUser();

    await Promise.all([
      SyncDriver.createSync(user, true),
      WaitListDriver.createWaitListRecord(user),
    ]);

    return {
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

export async function cleanupCollections(): Promise<void> {
  const collections = await mongoService.db.collections();

  const SKIP_COLLECTIONS = [Collections.USER, Collections.SYNC];

  const selectedCollections = collections.filter(
    (collection) => !SKIP_COLLECTIONS.includes(collection.collectionName),
  );

  await Promise.all(
    selectedCollections.map((collection) => collection.deleteMany()),
  );
}

export async function cleanupTestDb(): Promise<void> {
  try {
    await mongoService.stop();
  } catch (err) {
    console.error("Error during test db cleanup:", err);
  }
}
