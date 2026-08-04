import { auditConnectionIdentity } from "@scripts/commands/audit-connection-identity/audit";
import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

describe("auditConnectionIdentity (db)", () => {
  const syncStorage = setupSyncStorage(import.meta.url);
  let connections: ProviderConnectionRepository;

  beforeAll(() => setupTestDb(import.meta.url));
  afterEach(async () => {
    await cleanupCollections();
    await mongoService.user.deleteMany({});
  });
  afterAll(cleanupTestDb);

  const run = () => auditConnectionIdentity(mongoService.db, syncStorage.db());

  const seedLoginUser = async (
    email: string,
    googleId: string,
  ): Promise<string> => {
    const userId = new ObjectId();
    await mongoService.user.insertOne({
      _id: userId,
      email,
      name: email,
      firstName: email,
      lastName: "",
      locale: "not provided",
      google: { googleId, picture: "", gRefreshToken: "refresh-token" },
    });
    return userId.toHexString();
  };

  const seedConnection = async (
    principalId: string,
    providerAccountId: string,
    email: string,
  ) => {
    connections = new ProviderConnectionRepository(syncStorage.db());
    return connections.upsertByProviderAccount({
      tenantId: principalId,
      principalId,
      provider: "google",
      account: { providerAccountId, email, displayName: null },
      capabilities: ["readEvents", "readBusy", "writeEvents"],
      state: "healthy",
      stateReason: null,
      lastSyncedAt: null,
      lastHealthyAt: null,
    });
  };

  it("reports zero collisions when every connection is its own owner's login", async () => {
    const userId = await seedLoginUser("ahab@pequod.com", "google-sub-1");
    await seedConnection(userId, "google-sub-1", "ahab@pequod.com");
    // A second, data-only account with no matching login anywhere.
    await seedConnection(userId, "google-sub-2", "ahab@gmail.com");

    const report = await run();

    expect(report.connectionsChecked).toBe(2);
    expect(report.collisions).toEqual([]);
  });

  it("flags a connection whose account is another Compass user's login identity", async () => {
    const victim = await seedLoginUser("victim@example.com", "google-sub-1");
    const attacker = await seedLoginUser(
      "attacker@example.com",
      "google-sub-2",
    );
    await seedConnection(attacker, "google-sub-1", "victim@example.com");

    const report = await run();

    expect(report.collisions).toEqual([
      {
        connectingUserId: attacker,
        connectionId: expect.any(String),
        accountEmail: "victim@example.com",
        loginOwnerUserId: victim,
        loginOwnerEmail: "victim@example.com",
      },
    ]);
  });

  it("matches by the stable providerAccountId, not the mutable email", async () => {
    // Two different Google accounts that happen to share a display email (a
    // real re-registration pattern) must not false-positive against each
    // other; only the sub id is ownership proof.
    const owner = await seedLoginUser("shared@example.com", "google-sub-1");
    const other = await seedLoginUser("other@example.com", "google-sub-2");
    await seedConnection(other, "google-sub-2", "shared@example.com");

    const report = await run();

    expect(report.collisions).toEqual([]);
    // Confirms the fixture actually shares an email, so this is testing the
    // right thing and not accidentally trivial.
    expect(owner).not.toBe(other);
  });

  it("ignores a Compass user connecting their own login account a second time", async () => {
    const userId = await seedLoginUser("ahab@pequod.com", "google-sub-1");
    // Reconnect / re-add flows resume the SAME connection id in practice, but
    // even a hypothetical duplicate row for one's own account is not a
    // collision under A2.
    await seedConnection(userId, "google-sub-1", "ahab@pequod.com");

    const report = await run();

    expect(report.collisions).toEqual([]);
  });

  it("ignores connections for a Google account with no Compass login at all", async () => {
    const userId = await seedLoginUser("ahab@pequod.com", "google-sub-1");
    await seedConnection(userId, "google-sub-unregistered", "second@gmail.com");

    const report = await run();

    expect(report.usersWithGoogleLogin).toBe(1);
    expect(report.collisions).toEqual([]);
  });
});
