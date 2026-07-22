import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { useSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type CredentialUpsert,
  redactCredential,
} from "@sync/storage/contracts/credential.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";

const objectId = () => faker.database.mongodbObjectId();

const baseCredential = (
  overrides: Partial<CredentialUpsert> = {},
): CredentialUpsert => ({
  connectionId: objectId() as ConnectionId,
  provider: "google",
  refreshToken: "refresh-token-secret",
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
  ...overrides,
});

describe("CredentialRepository", () => {
  const storage = useSyncStorage();
  let db: Db;
  let repo: CredentialRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new CredentialRepository(db);
  });

  it("stores and reads back a credential keyed by connection id", async () => {
    const input = baseCredential();
    const stored = await repo.store(input);

    expect(stored._id).toBe(input.connectionId);
    expect(stored.refreshToken).toBe("refresh-token-secret");
    expect(stored.accessToken).toBeNull();
    expect(stored.createdAt).toBeInstanceOf(Date);

    const read = await repo.findByConnection(input.connectionId);
    expect(read?.refreshToken).toBe("refresh-token-secret");
  });

  it("returns null when no credential exists for the connection", async () => {
    expect(await repo.findByConnection(objectId() as ConnectionId)).toBeNull();
  });

  it("caches an access token and clears it when a new refresh token is stored", async () => {
    const input = baseCredential();
    await repo.store(input);

    const expiresAt = new Date(Date.now() + 3600_000);
    const cached = await repo.cacheAccessToken(
      input.connectionId,
      "access-token-value",
      expiresAt,
    );
    expect(cached?.accessToken).toBe("access-token-value");
    expect(cached?.accessTokenExpiresAt).toEqual(expiresAt);

    // Re-authorizing (new refresh token) must invalidate the cached access
    // token so a token from the superseded grant is never served.
    const reAuthed = await repo.store({
      ...input,
      refreshToken: "rotated-refresh-token",
    });
    expect(reAuthed.refreshToken).toBe("rotated-refresh-token");
    expect(reAuthed.accessToken).toBeNull();
    expect(reAuthed.accessTokenExpiresAt).toBeNull();
  });

  it("does not resurrect a credential that was deleted mid-refresh", async () => {
    const input = baseCredential();
    await repo.store(input);
    await repo.deleteByConnection(input.connectionId);

    const result = await repo.cacheAccessToken(
      input.connectionId,
      "access-token-value",
      new Date(Date.now() + 3600_000),
    );
    expect(result).toBeNull();
    expect(await repo.findByConnection(input.connectionId)).toBeNull();
  });

  it("reports whether a delete removed anything", async () => {
    const input = baseCredential();
    await repo.store(input);

    expect(await repo.deleteByConnection(input.connectionId)).toBe(true);
    expect(await repo.deleteByConnection(input.connectionId)).toBe(false);
  });

  it("keeps credentials out of the provider_connections collection", async () => {
    const input = baseCredential();
    await repo.store(input);

    // Credentials live in their own collection; nothing about a connection
    // read touches them.
    const inConnections = await db
      .collection(SYNC_COLLECTIONS.providerConnections)
      .findOne({ _id: input.connectionId });
    expect(inConnections).toBeNull();

    const inCredentials = await db
      .collection(SYNC_COLLECTIONS.credentials)
      .findOne({ _id: input.connectionId });
    expect(inCredentials).not.toBeNull();
  });

  it("redacts token-shaped fields for logging", async () => {
    const stored = await repo.store(baseCredential());
    await repo.cacheAccessToken(
      stored._id,
      "access-token-value",
      new Date(Date.now() + 3600_000),
    );
    const record = await repo.findByConnection(stored._id);
    const redacted = redactCredential(record!);

    expect(redacted.hasRefreshToken).toBe(true);
    expect(redacted.hasAccessToken).toBe(true);
    expect(redacted.scopeCount).toBe(1);
    // No token value can appear anywhere in the log-safe view.
    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain("refresh-token-secret");
    expect(serialized).not.toContain("access-token-value");
  });
});
