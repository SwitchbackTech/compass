import { type Db, type MongoClient } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { afterAll, beforeAll, beforeEach } from "bun:test";
import { createHash } from "node:crypto";

// Shared Mongo lifecycle for storage-backed sync tests.
//
// Connecting and installing the index manifest are the expensive parts of test
// setup, so they run once per file here; between tests only collections are
// wiped. Each file gets a stable unique database name derived from its path so
// parallel workers never collide.
function syncTestDbName(testFileUrl: string): string {
  return `synctest_${createHash("sha256").update(testFileUrl).digest("hex").slice(0, 12)}`;
}

export function setupSyncStorage(testFileUrl: string): {
  db: () => Db;
  client: () => MongoClient;
  mongo: () => SyncMongoService;
} {
  const mongo = new SyncMongoService();

  beforeAll(async () => {
    await connectWithRetry(mongo, {
      // A short server-selection timeout so a connect against a momentarily
      // saturated shared mongod REJECTS fast enough to retry within the runner's
      // per-file kill budget, instead of stalling on the driver's 30s default.
      uri: withServerSelectionTimeout(
        process.env["SYNC_MONGO_URI"] as string,
        SERVER_SELECTION_TIMEOUT_MS,
      ),
      databaseName: syncTestDbName(testFileUrl),
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

// A connect against the shared mongod must fail fast when the server is
// momentarily saturated so the retry loop below can ride out transient spikes.
const SERVER_SELECTION_TIMEOUT_MS = 8_000;
const CONNECT_ATTEMPTS = 5;

// Append a serverSelectionTimeoutMS to the mongo URI, respecting an existing
// query string.
function withServerSelectionTimeout(uri: string, ms: number): string {
  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}serverSelectionTimeoutMS=${ms}`;
}

// Connect, retrying a few times on a transient failure. The sync suite shares
// one in-memory mongod across parallel workers; when many files connect and
// install indexes at once, a bounded fast retry rides out transient spikes.
async function connectWithRetry(
  mongo: SyncMongoService,
  options: Parameters<SyncMongoService["connect"]>[0],
  attempts = CONNECT_ATTEMPTS,
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
