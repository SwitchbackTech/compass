import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { useSyncStorage } from "@sync/__tests__/helpers/storage";
import { type ProviderConnectionUpsert } from "@sync/storage/contracts/provider-connection.contracts";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";

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
  const storage = useSyncStorage();
  let db: Db;
  let repo: ProviderConnectionRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new ProviderConnectionRepository(db);
  });

  it("assigns a stable id and timestamps on first upsert", async () => {
    const created = await repo.upsertByProviderAccount(baseUpsert());
    expect(created._id).toMatch(/^[0-9a-f]{24}$/);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.state).toBe("importing");
    // A fresh connection carries no disconnect evidence.
    expect(created.disconnectedAt).toBeNull();
  });

  it("clears disconnect evidence when the account reconnects via upsert", async () => {
    const upsert = baseUpsert();
    const created = await repo.upsertByProviderAccount(upsert);
    await repo.markDisconnected(
      created.tenantId,
      created.principalId,
      created._id,
    );

    // Re-authorizing the same account upserts a live state; disconnectedAt must
    // not linger, or the row would be internally contradictory (live state,
    // non-null disconnectedAt) and a re-deriving worker would see it as gone.
    const reconnected = await repo.upsertByProviderAccount({
      ...upsert,
      state: "healthy",
    });

    expect(reconnected._id).toBe(created._id);
    expect(reconnected.state).toBe("healthy");
    expect(reconnected.disconnectedAt).toBeNull();
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

  it("rejects an actionRequired upsert with no reason before any write lands", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await expect(
      repo.upsertByProviderAccount(
        baseUpsert({
          tenantId,
          principalId,
          state: "actionRequired",
          stateReason: null,
        }),
      ),
    ).rejects.toThrow();
    // Nothing was persisted — the invalid state never reached Mongo.
    expect(await repo.listByPrincipal(tenantId, principalId)).toHaveLength(0);
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
