import { faker } from "@faker-js/faker";
import { type Db, type MongoClient } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { afterAll, beforeAll, beforeEach } from "bun:test";

// Shared Mongo lifecycle for storage-backed sync tests.
//
// Connecting and installing the index manifest are the expensive parts of test
// setup (hundreds of milliseconds against a replica set), so they run ONCE per
// file here; between tests only the collections are wiped, which is a few
// milliseconds. The old pattern paid the full connect/install/dropDatabase
// cycle in every beforeEach, which made a <30ms test cost ~700ms of setup and
// pushed the whole suite past three minutes.
//
// Holds a real SyncMongoService (not a bare client) so server tests can inject
// it into createSyncService, whose routes gate on `mongo.isConnected`. Each
// call gets its own randomly-named database, so test files running in parallel
// launcher processes (run-tests.ts) never collide. Tests that exercise
// connection or manifest behavior itself (sync-mongo.service.test.ts,
// index-manifest.test.ts) keep their own bespoke setup instead of this helper.
export function setupSyncStorage(): {
  db: () => Db;
  client: () => MongoClient;
  mongo: () => SyncMongoService;
} {
  const mongo = new SyncMongoService();

  beforeAll(async () => {
    await mongo.connect({
      uri: process.env["SYNC_MONGO_URI"] as string,
      databaseName: `synctest_${faker.database.mongodbObjectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
  });

  beforeEach(async () => {
    await Promise.all(
      Object.values(SYNC_COLLECTIONS).map((name) =>
        mongo.db.collection(name).deleteMany({}),
      ),
    );
  });

  afterAll(async () => {
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  return {
    db: () => mongo.db,
    client: () => mongo.client,
    mongo: () => mongo,
  };
}
