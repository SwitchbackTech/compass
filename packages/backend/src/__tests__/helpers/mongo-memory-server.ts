import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Provides the in-memory MongoDB URI for a test process.
 *
 * When `COMPASS_TEST_MONGO_URI` is set (by test-with-mongo.ts), the worker
 * reuses that shared replica set. Otherwise a throwaway server is started for
 * single-file runs (`bun test --preload ... path/to/file.db.test.ts`).
 *
 * A replica set (not standalone) is required because production code uses
 * multi-document transactions, which Mongo only supports on a replica set.
 */
let server: MongoMemoryReplSet | undefined;

export async function startMemoryMongo(): Promise<string> {
  const shared = process.env["COMPASS_TEST_MONGO_URI"];
  if (shared) return shared;

  if (server) return server.getUri();

  server = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: "compass-test", storageEngine: "wiredTiger" },
  });

  return server.getUri();
}

export async function stopMemoryMongo(): Promise<void> {
  if (process.env["COMPASS_TEST_MONGO_URI"]) return;

  if (!server) return;

  await server.stop();
  server = undefined;
}
