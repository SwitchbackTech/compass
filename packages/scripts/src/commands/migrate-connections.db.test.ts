import { migrateProviderConnections } from "@scripts/commands/migrate-connections/migrate";
import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { GOOGLE_SCOPES } from "@sync/providers/google/google.scopes";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");

describe("migrate-connections (db)", () => {
  const syncStorage = setupSyncStorage(import.meta.url);

  beforeAll(() => setupTestDb(import.meta.url));
  afterEach(async () => {
    await cleanupCollections();
    await mongoService.user.deleteMany({});
  });
  afterAll(cleanupTestDb);

  it("dry-run does not write Sync rows; apply then rerun is idempotent", async () => {
    const userId = new ObjectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "migrate@example.com",
      firstName: "Mig",
      lastName: "Rate",
      name: "Mig Rate",
      locale: "en",
      google: {
        googleId: "google-subject-migrate",
        picture: "",
        gRefreshToken: "legacy-refresh-token",
      },
    });

    const connections = new ProviderConnectionRepository(syncStorage.db());
    const credentials = new CredentialRepository(syncStorage.db());
    const users = await mongoService.user.find({}).toArray();

    const dry = await migrateProviderConnections(
      { connections, credentials },
      users,
      { dryRun: true, now: NOW },
    );
    expect(dry.counts.wouldCreate).toBe(1);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerConnections)
        .countDocuments(),
    ).toBe(0);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.credentials)
        .countDocuments(),
    ).toBe(0);

    // Source credential must remain untouched.
    const sourceBefore = await mongoService.user.findOne({ _id: userId });
    expect(sourceBefore?.google?.gRefreshToken).toBe("legacy-refresh-token");

    const first = await migrateProviderConnections(
      { connections, credentials },
      users,
      { dryRun: false, now: NOW },
    );
    expect(first.counts.created).toBe(1);
    expect(first.results[0]?.credentialVerified).toBe(true);
    const connectionId = first.results[0]?.connectionId;
    expect(connectionId).toMatch(/^[0-9a-f]{24}$/);

    const stored = await credentials.findByConnection(connectionId as never);
    expect(stored?.refreshToken).toBe("legacy-refresh-token");
    expect(stored?.scopes).toEqual([...GOOGLE_SCOPES]);
    expect(stored?.accessToken).toBeNull();

    const listed = await connections.listByPrincipal(
      userId.toHexString() as never,
      userId.toHexString() as never,
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.state).toBe("importing");
    expect(listed[0]?.account.providerAccountId).toBe("google-subject-migrate");

    const second = await migrateProviderConnections(
      { connections, credentials },
      users,
      { dryRun: false, now: NOW },
    );
    expect(second.counts.updated).toBe(1);
    expect(second.results[0]?.connectionId).toBe(connectionId);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerConnections)
        .countDocuments(),
    ).toBe(1);

    const sourceAfter = await mongoService.user.findOne({ _id: userId });
    expect(sourceAfter?.google?.gRefreshToken).toBe("legacy-refresh-token");
  });

  it("migrates an OAuth user and skips a password-only user", async () => {
    const oauthId = new ObjectId();
    const passwordId = new ObjectId();
    await mongoService.user.insertMany([
      {
        _id: oauthId,
        email: "oauth@example.com",
        firstName: "O",
        lastName: "Auth",
        name: "O Auth",
        locale: "en",
        google: {
          googleId: "google-oauth",
          picture: "",
          gRefreshToken: "oauth-refresh",
        },
      },
      {
        _id: passwordId,
        email: "password@example.com",
        firstName: "P",
        lastName: "Word",
        name: "P Word",
        locale: "en",
      },
    ]);

    const report = await migrateProviderConnections(
      {
        connections: new ProviderConnectionRepository(syncStorage.db()),
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    expect(report.counts.created).toBe(1);
    expect(report.counts.skipped).toBe(1);
    expect(
      report.results.find((r) => r.userId === passwordId.toHexString())
        ?.skipCategory,
    ).toBe("no_google_identity");
  });
});
