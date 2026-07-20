import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  assertForbiddenDatabaseUnreachable,
  SyncMongoService,
} from "@sync/storage/sync-mongo.service";

const uri = process.env["SYNC_MONGO_URI"] as string;

const uniqueDbName = () => `svc_${faker.database.mongodbObjectId()}`;

describe("SyncMongoService", () => {
  let service: SyncMongoService;

  afterEach(async () => {
    if (service?.isConnected) {
      await service.db.dropDatabase();
    }
    await service?.disconnect();
  });

  it("connects, installs manifests, and exposes the db", async () => {
    service = new SyncMongoService();
    await service.connect({
      uri,
      databaseName: uniqueDbName(),
      forbiddenDatabaseName: "prod_calendar",
      nodeEnv: NodeEnv.Test,
    });

    expect(service.isConnected).toBe(true);
    const names = new Set(
      (await service.db.listCollections({}, { nameOnly: true }).toArray()).map(
        (c) => c.name,
      ),
    );
    expect(names.has(SYNC_COLLECTIONS.providerConnections)).toBe(true);
  });

  it("throws when db is accessed before connecting", () => {
    service = new SyncMongoService();
    expect(() => service.db).toThrow(/not connected/);
  });

  it("fails to connect against an unreachable server", async () => {
    service = new SyncMongoService();
    await expect(
      service.connect({
        // Reserved TEST-NET address; connection is refused quickly.
        uri: "mongodb://192.0.2.1:27017/compass_sync?serverSelectionTimeoutMS=500&connectTimeoutMS=500",
        forbiddenDatabaseName: "prod_calendar",
        nodeEnv: NodeEnv.Test,
      }),
    ).rejects.toThrow();
  });

  it("supports multi-document transactions (replica set)", async () => {
    service = new SyncMongoService();
    await service.connect({
      uri,
      databaseName: uniqueDbName(),
      forbiddenDatabaseName: "prod_calendar",
      nodeEnv: NodeEnv.Test,
    });

    const collection = service.db.collection(SYNC_COLLECTIONS.jobs);
    const session = service.client.startSession();
    try {
      await session.withTransaction(async () => {
        await collection.insertOne({ coalescingKey: "a" }, { session });
        await collection.insertOne({ coalescingKey: "b" }, { session });
      });
    } finally {
      await session.endSession();
    }
    expect(await collection.countDocuments()).toBe(2);
  });
});

describe("assertForbiddenDatabaseUnreachable (least-privilege logic)", () => {
  it("passes when the probe is denied with an authorization error", async () => {
    await expect(
      assertForbiddenDatabaseUnreachable(() =>
        Promise.reject({ code: 13, message: "Unauthorized" }),
      ),
    ).resolves.toBeUndefined();
  });

  it("passes on an Atlas authorization error code", async () => {
    await expect(
      assertForbiddenDatabaseUnreachable(() =>
        Promise.reject({ code: 8000, message: "AtlasError: not authorized" }),
      ),
    ).resolves.toBeUndefined();
  });

  it("fails when the probe SUCCEEDS (over-privileged user)", async () => {
    await expect(
      assertForbiddenDatabaseUnreachable(() => Promise.resolve({ ok: 1 })),
    ).rejects.toThrow(/excessive privileges/);
  });

  it("rethrows a non-authorization error unchanged", async () => {
    await expect(
      assertForbiddenDatabaseUnreachable(() =>
        Promise.reject(new Error("network down")),
      ),
    ).rejects.toThrow("network down");
  });
});
