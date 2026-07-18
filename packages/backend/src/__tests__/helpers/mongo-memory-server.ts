import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Provides the in-memory MongoDB URI for a test process.
 *
 * Two modes:
 *  - Launcher mode: the test runner (`run-tests.ts`) starts ONE replica set and
 *    hands each per-file worker process a unique-database URI via
 *    `COMPASS_TEST_MONGO_URI`. The worker reuses it and never starts its own
 *    server, so the expensive mongod boot happens once for the whole package.
 *  - Standalone mode: running a single file directly with `bun test --preload`
 *    (no launcher) starts a throwaway server for that process.
 *
 * A replica set (not a standalone) is required because production code uses
 * multi-document transactions (`session.withTransaction`), which Mongo only
 * supports on a replica set.
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
  // In launcher mode the server is owned by the parent process; nothing to do.
  if (!server) return;

  await server.stop();
  server = undefined;
}
