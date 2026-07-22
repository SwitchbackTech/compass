import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { useSyncStorage } from "@sync/__tests__/helpers/storage";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import {
  type ProviderAuthAdapter,
  ProviderAuthError,
  type RefreshedCredential,
} from "@sync/providers/provider-auth.port";
import { type CredentialUpsert } from "@sync/storage/contracts/credential.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";

const objectId = () => faker.database.mongodbObjectId();

// A configurable ProviderAuthAdapter fake that counts refresh/revoke calls.
// buildAuthorizationUrl/exchangeAuthorizationCode are unused by custody.
class FakeAdapter implements ProviderAuthAdapter {
  readonly provider = "google" as const;
  refreshCalls = 0;
  revokedTokens: string[] = [];

  constructor(
    private readonly behavior: {
      refreshed?: RefreshedCredential;
      refreshError?: unknown;
      onRefresh?: () => Promise<void>;
    } = {},
  ) {}

  buildAuthorizationUrl(): string {
    throw new Error("not used");
  }
  exchangeAuthorizationCode(): Promise<never> {
    throw new Error("not used");
  }

  async refreshAccessToken(): Promise<RefreshedCredential> {
    this.refreshCalls += 1;
    if (this.behavior.onRefresh) await this.behavior.onRefresh();
    if (this.behavior.refreshError) throw this.behavior.refreshError;
    return (
      this.behavior.refreshed ?? {
        accessToken: "refreshed-access-token",
        expiresAt: new Date("2099-01-01T00:00:00Z"),
        grantedScopes: [],
      }
    );
  }

  async revoke(input: { token: string }): Promise<void> {
    this.revokedTokens.push(input.token);
  }
}

const baseCredential = (
  connectionId: ConnectionId,
  overrides: Partial<CredentialUpsert> = {},
): CredentialUpsert => ({
  connectionId,
  provider: "google",
  refreshToken: "stored-refresh-token",
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
  ...overrides,
});

describe("CredentialCustody", () => {
  const storage = useSyncStorage();
  let db: Db;
  let repo: CredentialRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new CredentialRepository(db);
  });

  const fixedNow = () => new Date("2026-01-01T00:00:00Z");

  it("refreshes and caches an access token when none is cached", async () => {
    const connectionId = objectId() as ConnectionId;
    const adapter = new FakeAdapter({
      refreshed: {
        accessToken: "fresh-token",
        expiresAt: new Date("2026-01-01T01:00:00Z"),
        grantedScopes: [],
      },
    });
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));

    const token = await custody.getValidAccessToken(connectionId);

    expect(token).toBe("fresh-token");
    expect(adapter.refreshCalls).toBe(1);
    const cached = await repo.findByConnection(connectionId);
    expect(cached?.accessToken).toBe("fresh-token");
  });

  it("serves the cached token without refreshing when it is still valid", async () => {
    const connectionId = objectId() as ConnectionId;
    const adapter = new FakeAdapter();
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));
    await repo.cacheAccessToken(
      connectionId,
      "cached-token",
      new Date("2026-01-01T01:00:00Z"), // an hour ahead of fixedNow
    );

    const token = await custody.getValidAccessToken(connectionId);

    expect(token).toBe("cached-token");
    expect(adapter.refreshCalls).toBe(0);
  });

  it("refreshes when the cached token is within the expiry skew window", async () => {
    const connectionId = objectId() as ConnectionId;
    const adapter = new FakeAdapter({
      refreshed: {
        accessToken: "renewed",
        expiresAt: new Date("2026-01-01T01:00:00Z"),
        grantedScopes: [],
      },
    });
    const custody = new CredentialCustody(repo, adapter, fixedNow, 60_000);
    await custody.store(baseCredential(connectionId));
    // Expires 30s after now — inside the 60s skew, so it must be refreshed.
    await repo.cacheAccessToken(
      connectionId,
      "about-to-expire",
      new Date("2026-01-01T00:00:30Z"),
    );

    const token = await custody.getValidAccessToken(connectionId);

    expect(token).toBe("renewed");
    expect(adapter.refreshCalls).toBe(1);
  });

  it("coalesces concurrent requests into a single refresh", async () => {
    const connectionId = objectId() as ConnectionId;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const adapter = new FakeAdapter({
      refreshed: {
        accessToken: "shared-token",
        expiresAt: new Date("2099-01-01T00:00:00Z"),
        grantedScopes: [],
      },
      // Hold the refresh open until both callers are queued.
      onRefresh: () => gate,
    });
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));

    const first = custody.getValidAccessToken(connectionId);
    const second = custody.getValidAccessToken(connectionId);
    release();
    const [a, b] = await Promise.all([first, second]);

    expect(a).toBe("shared-token");
    expect(b).toBe("shared-token");
    expect(adapter.refreshCalls).toBe(1);
  });

  it("refreshes again on a later call once the in-flight refresh settled", async () => {
    const connectionId = objectId() as ConnectionId;
    // Cached token already expired, so every call must refresh.
    const adapter = new FakeAdapter({
      refreshed: {
        accessToken: "t",
        expiresAt: new Date("2026-01-01T00:00:10Z"),
        grantedScopes: [],
      },
    });
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));

    await custody.getValidAccessToken(connectionId);
    await custody.getValidAccessToken(connectionId);

    expect(adapter.refreshCalls).toBe(2);
  });

  it("rejects with missingRefreshToken when no credential exists", async () => {
    const adapter = new FakeAdapter();
    const custody = new CredentialCustody(repo, adapter, fixedNow);

    const error = (await custody
      .getValidAccessToken(objectId() as ConnectionId)
      .catch((e) => e)) as ProviderAuthError;

    expect(error).toBeInstanceOf(ProviderAuthError);
    expect(error.reason).toBe("missingRefreshToken");
    expect(adapter.refreshCalls).toBe(0);
  });

  it("propagates authorizationRevoked from the adapter", async () => {
    const connectionId = objectId() as ConnectionId;
    const adapter = new FakeAdapter({
      refreshError: new ProviderAuthError("authorizationRevoked", "revoked"),
    });
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));

    const error = (await custody
      .getValidAccessToken(connectionId)
      .catch((e) => e)) as ProviderAuthError;

    expect(error.reason).toBe("authorizationRevoked");
  });

  it("does not serve a token when a disconnect deletes the credential mid-refresh", async () => {
    const connectionId = objectId() as ConnectionId;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const adapter = new FakeAdapter({
      refreshed: {
        accessToken: "orphan-token",
        expiresAt: new Date("2099-01-01T00:00:00Z"),
        grantedScopes: [],
      },
      onRefresh: () => gate,
    });
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));

    // Start a refresh, delete the credential while it is in flight, then let
    // the refresh finish.
    const inFlight = custody.getValidAccessToken(connectionId);
    await repo.deleteByConnection(connectionId);
    release();

    const error = (await inFlight.catch((e) => e)) as ProviderAuthError;
    expect(error).toBeInstanceOf(ProviderAuthError);
    expect(error.reason).toBe("missingRefreshToken");
    // The token was never re-cached, so the deleted credential stays gone.
    expect(await repo.findByConnection(connectionId)).toBeNull();
  });

  it("deletes the credential and revokes it on disconnect", async () => {
    const connectionId = objectId() as ConnectionId;
    const adapter = new FakeAdapter();
    const custody = new CredentialCustody(repo, adapter, fixedNow);
    await custody.store(baseCredential(connectionId));

    await custody.disconnect(connectionId);

    expect(await repo.findByConnection(connectionId)).toBeNull();
    expect(adapter.revokedTokens).toEqual(["stored-refresh-token"]);
  });

  it("disconnecting an unknown connection revokes nothing and does not throw", async () => {
    const adapter = new FakeAdapter();
    const custody = new CredentialCustody(repo, adapter, fixedNow);

    await custody.disconnect(objectId() as ConnectionId);

    expect(adapter.revokedTokens).toEqual([]);
  });
});
