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
  // Intentionally does not disconnect. Each test file runs in its own process
  // (see run-tests.ts) that shares one Mongo server and exits when the file
  // finishes, so tearing the client down here is unnecessary. It was also
  // harmful: a file with sibling `describe` blocks that each `beforeAll(setup)`
  // would disconnect after the first block, and the next block's
  // `beforeEach(cleanupCollections)` then ran against a closed client. Dropping
  // the per-describe teardown keeps the single connection alive for the file.
}
