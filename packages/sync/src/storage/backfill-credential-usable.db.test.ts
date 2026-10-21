import { faker } from "@faker-js/faker";
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
import { backfillCredentialUsable } from "@sync/storage/backfill-credential-usable";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";

const objectId = () => faker.database.mongodbObjectId();

describe("backfillCredentialUsable", () => {
  const storage = setupSyncStorage(import.meta.url);

  it("stamps credentialUsable from the credentials row for resources missing the field", async () => {
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

    await db.collection(SYNC_COLLECTIONS.syncResources).insertMany([
      {
        _id: objectId(),
        tenantId,
        principalId,
        connectionId: withCredential,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: objectId(),
        tenantId,
        principalId,
        connectionId: withoutCredential,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const stamped = await backfillCredentialUsable(db);
    expect(stamped).toBe(2);

    const rows = await db
      .collection(SYNC_COLLECTIONS.syncResources)
      .find({ resourceKind: "calendarList" })
      .toArray();
    const byConnection = Object.fromEntries(
      rows.map((row) => [String(row["connectionId"]), row["credentialUsable"]]),
    );
    expect(byConnection[withCredential]).toBe(true);
    expect(byConnection[withoutCredential]).toBe(false);

    expect(await backfillCredentialUsable(db)).toBe(0);
  });
});
