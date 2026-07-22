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
    await connectWithRetry(mongo, {
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

// Connect, retrying a few times on a transient failure. The whole sync suite
// runs each test file in its own process against ONE shared in-memory mongod
// (run-tests.ts); when many processes connect and install indexes at once, an
// unlucky file can hit a transient server-selection timeout or refused
// connection and fail its whole `beforeAll`. The server is alive (its neighbors
// pass), so a short retry converges instead of flaking the run. The common path
// connects on the first attempt with no delay; the backoff runs only on a retry.
async function connectWithRetry(
  mongo: SyncMongoService,
  options: Parameters<SyncMongoService["connect"]>[0],
  attempts = 4,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongo.connect(options);
      return;
    } catch (error) {
      // A half-open client from a connect that failed mid-way must be closed
      // before retrying, or it leaks. disconnect() is safe when nothing opened.
      await mongo.disconnect().catch(() => {});
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
}
