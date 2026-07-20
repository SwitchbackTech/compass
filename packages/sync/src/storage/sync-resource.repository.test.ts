import { faker } from "@faker-js/faker";
import { type Db, MongoClient } from "mongodb";
import { installIndexManifest } from "@sync/storage/index-manifest";
import { type SyncResourceUpsert } from "@sync/storage/sync-resource.record";
import { SyncResourceRepository } from "@sync/storage/sync-resource.repository";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();

const upsert = (
  overrides: Partial<SyncResourceUpsert> = {},
): SyncResourceUpsert =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    connectionId: objectId(),
    resourceKind: "events",
    calendarId: objectId(),
    ...overrides,
  }) as SyncResourceUpsert;

describe("SyncResourceRepository", () => {
  let client: MongoClient;
  let db: Db;
  let repo: SyncResourceRepository;

  beforeEach(async () => {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(`res_${objectId()}`);
    await installIndexManifest(db);
    repo = new SyncResourceRepository(db);
  });

  afterEach(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("creates a resource with empty cursors and generation 0", async () => {
    const resource = await repo.ensure(upsert());
    expect(resource.syncCursor).toBeNull();
    expect(resource.pageCursor).toBeNull();
    expect(resource.importGeneration).toBe(0);
  });

  it("ensures one resource per (connection, kind, calendar)", async () => {
    const key = {
      connectionId: objectId(),
      resourceKind: "events" as const,
      calendarId: objectId(),
    };
    const first = await repo.ensure(upsert(key));
    const second = await repo.ensure(upsert(key));
    expect(second._id).toBe(first._id);
    expect(await db.collection("sync_resources").countDocuments()).toBe(1);
  });

  it("keeps the calendar-list resource distinct from event resources", async () => {
    const connectionId = objectId();
    await repo.ensure(
      upsert({ connectionId, resourceKind: "calendarList", calendarId: null }),
    );
    await repo.ensure(
      upsert({ connectionId, resourceKind: "events", calendarId: objectId() }),
    );
    expect(await db.collection("sync_resources").countDocuments()).toBe(2);
  });

  it("advancing the cursor clears the mid-batch page checkpoint", async () => {
    const resource = await repo.ensure(upsert());
    await repo.setPageCheckpoint(resource._id, "page-token-2");
    const mid = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(mid?.pageCursor).toBe("page-token-2");

    const succeededAt = new Date("2026-07-20T12:00:00.000Z");
    await repo.advanceCursor(resource._id, "sync-token-final", succeededAt);
    const done = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(done?.syncCursor).toBe("sync-token-final");
    expect(done?.pageCursor).toBeNull();
    expect(done?.lastSuccessAt).toEqual(succeededAt);
  });

  it("updates and clears the push subscription", async () => {
    const resource = await repo.ensure(upsert());
    await repo.updateSubscription(resource._id, {
      subscriptionId: "chan-1",
      subscriptionResourceId: "res-1",
      subscriptionExpiresAt: new Date("2026-07-27T00:00:00.000Z"),
    });
    let read = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(read?.subscriptionId).toBe("chan-1");

    await repo.clearSubscription(resource._id);
    read = await repo.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(read?.subscriptionId).toBeNull();
    expect(read?.subscriptionExpiresAt).toBeNull();
  });

  it("starts a new import generation for a repair", async () => {
    const resource = await repo.ensure(upsert());
    expect(await repo.startNewGeneration(resource._id)).toBe(1);
    expect(await repo.startNewGeneration(resource._id)).toBe(2);
  });

  it("scopes findById to the owning principal", async () => {
    const resource = await repo.ensure(upsert());
    expect(
      await repo.findById(
        resource.tenantId,
        objectId() as SyncResourceUpsert["principalId"],
        resource._id,
      ),
    ).toBeNull();
  });
});
