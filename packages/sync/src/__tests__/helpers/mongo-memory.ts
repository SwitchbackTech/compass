import { MongoMemoryReplSet } from "mongodb-memory-server";

// In-memory Mongo for the sync test suite. Mirrors the backend helper's two
// modes: in launcher mode (run-tests.ts) each worker reuses the shared
// per-file URI from COMPASS_TEST_MONGO_URI; standalone, a single file starts
// its own throwaway replica set. A replica set (not standalone) is required
// because Sync uses multi-document transactions in later commits.

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
  if (!server) return;
  await server.stop();
  server = undefined;
}
