import { faker } from "@faker-js/faker";
import { type Db, MongoClient } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  installIndexManifest,
  SYNC_INDEX_MANIFEST,
} from "@sync/storage/index-manifest";

const uri = process.env["SYNC_MONGO_URI"] as string;

describe("installIndexManifest", () => {
  let client: MongoClient;
  let db: Db;

  beforeEach(async () => {
    client = new MongoClient(uri);
    await client.connect();
    // Unique database per test so files/tests never collide on the shared server.
    db = client.db(`manifest_${faker.database.mongodbObjectId()}`);
  });

  afterEach(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("creates every declared collection", async () => {
    await installIndexManifest(db);
    const names = new Set(
      (await db.listCollections({}, { nameOnly: true }).toArray()).map(
        (c) => c.name,
      ),
    );
    for (const collection of Object.values(SYNC_COLLECTIONS)) {
      expect(names.has(collection)).toBe(true);
    }
  });

  it("creates the declared indexes for a collection", async () => {
    await installIndexManifest(db);
    const indexes = await db.collection(SYNC_COLLECTIONS.commands).indexes();
    const names = indexes.map((i) => i.name);
    expect(names).toContain("idempotency_key");
    const idempotency = indexes.find((i) => i.name === "idempotency_key");
    expect(idempotency?.unique).toBe(true);
  });

  it("is idempotent — running twice does not throw", async () => {
    await installIndexManifest(db);
    await installIndexManifest(db);
    const indexes = await db
      .collection(SYNC_COLLECTIONS.providerConnections)
      .indexes();
    // The unique provider-account identity index exists exactly once.
    expect(
      indexes.filter((i) => i.name === "provider_account_identity"),
    ).toHaveLength(1);
  });

  it("installs a TTL index on deletion markers", async () => {
    await installIndexManifest(db);
    const indexes = await db
      .collection(SYNC_COLLECTIONS.deletionMarkers)
      .indexes();
    const ttl = indexes.find((i) => i.name === "ttl_expiry");
    expect(ttl?.expireAfterSeconds).toBe(0);
  });

  it("enforces the unique command idempotency key", async () => {
    await installIndexManifest(db);
    const commands = db.collection(SYNC_COLLECTIONS.commands);
    const key = {
      tenantId: "t",
      principalId: "p",
      idempotencyKey: "k",
    };
    await commands.insertOne(key);
    await expect(commands.insertOne(key)).rejects.toThrow();
  });

  it("covers every collection in the manifest", () => {
    expect(Object.keys(SYNC_INDEX_MANIFEST).sort()).toEqual(
      Object.values(SYNC_COLLECTIONS).sort(),
    );
  });

  it("allows many unlinked events while still rejecting duplicate provider identities", async () => {
    await installIndexManifest(db);
    const events = db.collection(SYNC_COLLECTIONS.events);

    // Multiple unlinked events store provider fields as null; the partial
    // unique index must not collide them (regression for the sparse hazard).
    await events.insertOne({
      principalId: "p",
      connectionId: null,
      calendarId: null,
      providerEventId: null,
    });
    await events.insertOne({
      principalId: "p",
      connectionId: null,
      calendarId: null,
      providerEventId: null,
    });
    expect(await events.countDocuments()).toBe(2);

    // Two genuinely linked events with the same provider identity DO collide.
    const linked = {
      principalId: "p",
      connectionId: "c",
      calendarId: "cal",
      providerEventId: "evt-1",
    };
    await events.insertOne(linked);
    await expect(events.insertOne({ ...linked })).rejects.toThrow();
  });
});
