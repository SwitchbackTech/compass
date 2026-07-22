import { MongoMemoryReplSet } from "mongodb-memory-server";

// In-memory Mongo for the sync test suite. Reuses COMPASS_TEST_MONGO_URI from
// test-with-mongo.ts when set; otherwise starts a throwaway replica set for
// single-file runs. A replica set is required for multi-document transactions.

let server: MongoMemoryReplSet | undefined;

export async function startMemoryMongo(): Promise<string> {
  const shared = process.env["COMPASS_TEST_MONGO_URI"];
  if (shared) return shared;
  if (server) return server.getUri();

  server = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      name: "compass-sync-test",
      storageEngine: "wiredTiger",
    },
  });
  return server.getUri();
}

export async function stopMemoryMongo(): Promise<void> {
  if (process.env["COMPASS_TEST_MONGO_URI"]) return;

  if (!server) return;
  await server.stop();
  server = undefined;
}
