import { enterTestFileUrl } from "@backend/__tests__/helpers/test-file-context";
import mongoService from "@backend/common/services/mongo.service";
import { createHash } from "node:crypto";

/** Stable per-file database name for isolated parallel test runs. */
export function testDbName(testFileUrl: string): string {
  return `test_${createHash("sha256").update(testFileUrl).digest("hex").slice(0, 12)}`;
}

/**
 * Connect mongoService to a unique database for the calling test file.
 */
export async function setupTestDb(testFileUrl: string): Promise<void> {
  enterTestFileUrl(testFileUrl);
  const dbName = testDbName(testFileUrl);

  try {
    await mongoService.start(dbName);
  } catch (err) {
    const error = err as Error;

    console.error(
      `test db setup failed with error: ${error.message}`,
      error.stack,
    );

    throw error;
  }

  const { setupBackendTestSeams } = await import(
    "@backend/__tests__/helpers/mock.setup"
  );
  setupBackendTestSeams();
}

export async function cleanupCollections(): Promise<void> {
  const collections = await mongoService.db.collections();

  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function cleanupTestDb(): Promise<void> {
  // Intentionally does not disconnect within a file. Cross-file isolation comes
  // from mongoService.start() reconnecting when the per-file database name changes.
}
