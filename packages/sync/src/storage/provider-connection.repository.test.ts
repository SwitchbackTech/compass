import { faker } from "@faker-js/faker";
import { type Db, MongoClient } from "mongodb";
import { installIndexManifest } from "@sync/storage/index-manifest";
import { type ProviderConnectionUpsert } from "@sync/storage/provider-connection.record";
import { ProviderConnectionRepository } from "@sync/storage/provider-connection.repository";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();

const baseUpsert = (
  overrides: Partial<ProviderConnectionUpsert> = {},
): ProviderConnectionUpsert =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    provider: "google",
    account: {
      providerAccountId: "acct-1",
      email: "user@gmail.com",
      displayName: "User",
    },
    capabilities: ["readEvents"],
    state: "importing",
    stateReason: null,
    lastSyncedAt: null,
    lastHealthyAt: null,
    ...overrides,
  }) as ProviderConnectionUpsert;

describe("ProviderConnectionRepository", () => {
  let client: MongoClient;
  let db: Db;
  let repo: ProviderConnectionRepository;

  beforeEach(async () => {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(`conn_${objectId()}`);
    await installIndexManifest(db);
    repo = new ProviderConnectionRepository(db);
  });

  afterEach(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("assigns a stable id and timestamps on first upsert", async () => {
    const created = await repo.upsertByProviderAccount(baseUpsert());
    expect(created._id).toMatch(/^[0-9a-f]{24}$/);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.state).toBe("importing");
  });

  it("reconnecting the same account updates one document, not two", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const first = await repo.upsertByProviderAccount(
      baseUpsert({ tenantId, principalId }),
    );
    const second = await repo.upsertByProviderAccount(
      baseUpsert({ tenantId, principalId, state: "healthy" }),
    );

    expect(second._id).toBe(first._id);
    expect(second.createdAt).toEqual(first.createdAt);
    expect(second.state).toBe("healthy");
    const all = await repo.listByPrincipal(tenantId, principalId);
    expect(all).toHaveLength(1);
  });

  it("keeps multiple accounts for one principal isolated", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await repo.upsertByProviderAccount(
      baseUpsert({
        tenantId,
        principalId,
        account: {
          providerAccountId: "acct-1",
          email: "a@x.com",
          displayName: null,
        },
      }),
    );
    await repo.upsertByProviderAccount(
      baseUpsert({
        tenantId,
        principalId,
        account: {
          providerAccountId: "acct-2",
          email: "b@x.com",
          displayName: null,
        },
      }),
    );
    const all = await repo.listByPrincipal(tenantId, principalId);
    expect(all).toHaveLength(2);
  });

  it("updates capabilities on reconnect", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await repo.upsertByProviderAccount(
      baseUpsert({ tenantId, principalId, capabilities: ["readEvents"] }),
    );
    const updated = await repo.upsertByProviderAccount(
      baseUpsert({
        tenantId,
        principalId,
        capabilities: ["readEvents", "writeEvents", "changeNotifications"],
      }),
    );
    expect(updated.capabilities).toEqual([
      "readEvents",
      "writeEvents",
      "changeNotifications",
    ]);
  });

  it("does not leak one principal's connections to another", async () => {
    const tenantId = objectId();
    const mine = objectId();
    const theirs = objectId();
    const created = await repo.upsertByProviderAccount(
      baseUpsert({ tenantId, principalId: mine }),
    );

    expect(await repo.listByPrincipal(tenantId, theirs)).toHaveLength(0);
    expect(await repo.findById(tenantId, theirs, created._id)).toBeNull();
    expect(await repo.findById(tenantId, mine, created._id)).not.toBeNull();
  });

  it("rejects a raw duplicate insert violating the unique account identity", async () => {
    const shared = {
      tenantId: objectId(),
      principalId: objectId(),
      provider: "google",
      account: { providerAccountId: "dup", email: null, displayName: null },
    };
    const collection = db.collection("provider_connections");
    await collection.insertOne({ _id: objectId(), ...shared } as never);
    await expect(
      collection.insertOne({ _id: objectId(), ...shared } as never),
    ).rejects.toThrow();
  });
});
