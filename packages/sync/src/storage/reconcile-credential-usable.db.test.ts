import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  TEST_CREDENTIAL_ENCRYPTION_KEY,
  toStoredOauthCredentialUpsert,
} from "@sync/__tests__/helpers/credential-encryption";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { reconcileCredentialUsable } from "@sync/storage/reconcile-credential-usable";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";

const objectId = () => faker.database.mongodbObjectId();

const insertResource = async (
  db: Db,
  input: {
    tenantId: TenantId;
    principalId: PrincipalId;
    connectionId: ConnectionId;
    credentialUsable?: boolean;
  },
) => {
  await db.collection(SYNC_COLLECTIONS.syncResources).insertOne({
    _id: objectId(),
    tenantId: input.tenantId,
    principalId: input.principalId,
    connectionId: input.connectionId,
    resourceKind: "calendarList",
    calendarId: null,
    syncCursor: null,
    pageCursor: null,
    importGeneration: 0,
    activeGeneration: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    bootstrapState: "ready",
    subscriptionId: null,
    subscriptionResourceId: null,
    subscriptionToken: null,
    subscriptionExpiresAt: null,
    credentialUsable: input.credentialUsable,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
};

describe("reconcileCredentialUsable", () => {
  const storage = setupSyncStorage(import.meta.url);

  it("stamps missing fields and is idempotent when already correct", async () => {
    const db = storage.db();
    const credentials = new CredentialRepository(db);
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const withCredential = objectId() as ConnectionId;
    const withoutCredential = objectId() as ConnectionId;

    await credentials.store(
      toStoredOauthCredentialUpsert(TEST_CREDENTIAL_ENCRYPTION_KEY, {
        connectionId: withCredential,
        provider: "google",
        refreshToken: "refresh",
        scopes: [],
      }),
    );
    await insertResource(db, {
      tenantId,
      principalId,
      connectionId: withCredential,
    });
    await insertResource(db, {
      tenantId,
      principalId,
      connectionId: withoutCredential,
    });

    const first = await reconcileCredentialUsable(db);
    expect(first.scanned).toBe(2);
    expect(first.corrected).toBe(2);

    const second = await reconcileCredentialUsable(db);
    expect(second.scanned).toBe(2);
    expect(second.corrected).toBe(0);
  });

  it("corrects drifted true and false values", async () => {
    const db = storage.db();
    const credentials = new CredentialRepository(db);
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const live = objectId() as ConnectionId;
    const dead = objectId() as ConnectionId;

    await credentials.store(
      toStoredOauthCredentialUpsert(TEST_CREDENTIAL_ENCRYPTION_KEY, {
        connectionId: live,
        provider: "google",
        refreshToken: "live",
        scopes: [],
      }),
    );
    await insertResource(db, {
      tenantId,
      principalId,
      connectionId: live,
      credentialUsable: false,
    });
    await insertResource(db, {
      tenantId,
      principalId,
      connectionId: dead,
      credentialUsable: true,
    });

    const result = await reconcileCredentialUsable(db);
    expect(result.corrected).toBe(2);

    const rows = await db
      .collection(SYNC_COLLECTIONS.syncResources)
      .find({ resourceKind: "calendarList" })
      .toArray();
    const byConnection = Object.fromEntries(
      rows.map((row) => [String(row["connectionId"]), row["credentialUsable"]]),
    );
    expect(byConnection[live]).toBe(true);
    expect(byConnection[dead]).toBe(false);
  });
});
