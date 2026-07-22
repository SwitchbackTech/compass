import { faker } from "@faker-js/faker";
import { type Db, MongoClient } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { installIndexManifest } from "@sync/storage/index-manifest";
import { afterAll, beforeAll, beforeEach } from "bun:test";

// Shared Mongo lifecycle for storage-backed sync tests.
//
// Connecting a client and installing the index manifest are the expensive parts
// of test setup (hundreds of milliseconds against a replica set), so they run
// ONCE per describe scope here; between tests only the collections are wiped,
// which is a few milliseconds. The old pattern paid the full
// connect/install/dropDatabase cycle in every beforeEach, which made a <30ms
// test cost ~700ms of setup and pushed the whole suite past three minutes.
//
// Each call gets its own randomly-named database, so test files running in
// parallel launcher processes (run-tests.ts) never collide. Tests that
// exercise connection or manifest behavior itself (sync-mongo.service.test.ts,
// index-manifest.test.ts) keep their own bespoke setup instead of this helper.
export function useSyncStorage(): {
  db: () => Db;
  client: () => MongoClient;
} {
  let client: MongoClient | undefined;
  let db: Db | undefined;

  beforeAll(async () => {
    client = new MongoClient(process.env["SYNC_MONGO_URI"] as string);
    await client.connect();
    db = client.db(`synctest_${faker.database.mongodbObjectId()}`);
    await installIndexManifest(db);
  });

  beforeEach(async () => {
    const connected = requireDb(db);
    await Promise.all(
      Object.values(SYNC_COLLECTIONS).map((name) =>
        connected.collection(name).deleteMany({}),
      ),
    );
  });

  afterAll(async () => {
    await db?.dropDatabase();
    await client?.close();
  });

  return {
    db: () => requireDb(db),
    client: () => {
      if (!client) throw new Error("useSyncStorage: not connected yet");
      return client;
    },
  };
}

function requireDb(db: Db | undefined): Db {
  if (!db) throw new Error("useSyncStorage: not connected yet");
  return db;
}
