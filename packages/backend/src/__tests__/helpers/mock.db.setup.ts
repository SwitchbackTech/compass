import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Setup a test database
 */
export async function setupTestDb(): Promise<void> {
  try {
    await mongoService.start(true);
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
