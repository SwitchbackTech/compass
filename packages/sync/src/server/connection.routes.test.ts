import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { createSyncService, type SyncService } from "@sync/app";
import { signInternalRequest } from "@sync/auth/internal-auth";
import { type SyncConfig } from "@sync/config/sync.config";
import { verifyOAuthState } from "@sync/oauth/oauth-state";
import {
  type ProviderAuthAdapter,
  type RefreshedCredential,
} from "@sync/providers/provider-auth.port";
import {
  BEGIN_PATH,
  CONNECTIONS_PATH,
  OAUTH_CALLBACK_PATH,
} from "@sync/server/connection.routes";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { type AddressInfo } from "node:net";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();
const SECRET = "internal-secret";

const testConfig = (overrides: Partial<SyncConfig> = {}): SyncConfig =>
  ({
    NODE_ENV: NodeEnv.Test,
    PORT: 0,
    MONGO_URI: uri,
    INTERNAL_AUTH_TOKEN: SECRET,
    CALLBACK_BASE_URL: "http://localhost:3010",
    EXECUTION: "passive",
    MAX_CONCURRENCY: 4,
    ...overrides,
  }) as SyncConfig;

// A minimal provider auth adapter: disconnect exercises revoke and begin
// exercises buildAuthorizationUrl; both record their inputs instead of hitting
// the network.
class FakeAuthAdapter implements ProviderAuthAdapter {
  readonly provider = "google" as const;
  revoked: string[] = [];
  authorizations: Array<{ state: string; redirectUri: string }> = [];
  buildAuthorizationUrl(input: { state: string; redirectUri: string }): string {
    this.authorizations.push(input);
    return `https://consent.example.com/?state=${input.state}`;
  }
  exchangeAuthorizationCode(): Promise<never> {
    throw new Error("unused");
  }
  refreshAccessToken(): Promise<RefreshedCredential> {
    throw new Error("unused");
  }
  async revoke(input: { token: string }): Promise<void> {
    this.revoked.push(input.token);
  }
}

const seedConnection = (
  repo: ProviderConnectionRepository,
  tenantId: string,
  principalId: string,
  email: string,
) =>
  repo.upsertByProviderAccount({
    tenantId: tenantId as TenantId,
    principalId: principalId as PrincipalId,
    provider: "google",
    account: {
      providerAccountId: objectId(),
      email,
      displayName: null,
    },
    capabilities: ["readEvents"],
    state: "healthy",
    stateReason: null,
    lastSyncedAt: null,
    lastHealthyAt: null,
  });

// Sign like the trusted Compass API would, so the request clears internal auth.
const signedHeaders = (
  tenantId: string,
  principalId: string,
): Record<string, string> => {
  const timestamp = Date.now();
  return {
    "x-sync-tenant": tenantId,
    "x-sync-principal": principalId,
    "x-sync-timestamp": String(timestamp),
    "x-sync-signature": signInternalRequest(SECRET, {
      timestamp,
      tenantId,
      principalId,
    }),
  };
};

describe("GET /internal/connections", () => {
  let mongo: SyncMongoService;
  let repo: ProviderConnectionRepository;
  let service: SyncService;
  let base: string;

  const startService = async (
    config: SyncConfig = testConfig(),
    authAdapter?: ProviderAuthAdapter,
  ) => {
    service = createSyncService(config, { mongo, authAdapter });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `conn_api_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
    repo = new ProviderConnectionRepository(mongo.db);
  });

  afterEach(async () => {
    await service?.stop();
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  it("returns the caller's connections mapped to the wire contract", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await seedConnection(repo, tenantId, principalId, "me@example.com");
    await startService();

    const res = await fetch(`${base}${CONNECTIONS_PATH}`, {
      headers: signedHeaders(tenantId, principalId),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      connections: Array<Record<string, unknown>>;
    };
    expect(body.connections).toHaveLength(1);
    expect(body.connections[0]).toMatchObject({
      principalId,
      provider: "google",
      state: "healthy",
      account: { email: "me@example.com", displayName: null },
    });
    // Timestamps are ISO strings on the wire, not Dates.
    expect(typeof body.connections[0].createdAt).toBe("string");
  });

  it("scopes results to the authenticated principal", async () => {
    const tenantId = objectId();
    const mine = objectId();
    const other = objectId();
    await seedConnection(repo, tenantId, mine, "mine@example.com");
    await seedConnection(repo, tenantId, other, "other@example.com");
    await startService();

    const res = await fetch(`${base}${CONNECTIONS_PATH}`, {
      headers: signedHeaders(tenantId, mine),
    });

    const body = (await res.json()) as {
      connections: Array<{ account: { email: string } }>;
    };
    expect(body.connections).toHaveLength(1);
    expect(body.connections[0].account.email).toBe("mine@example.com");
  });

  it("returns an empty list for a principal with no connections", async () => {
    await startService();

    const res = await fetch(`${base}${CONNECTIONS_PATH}`, {
      headers: signedHeaders(objectId(), objectId()),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connections: [] });
  });

  it("rejects a request that is not signed", async () => {
    await startService();

    const res = await fetch(`${base}${CONNECTIONS_PATH}`);

    expect(res.status).toBe(401);
  });

  it("rejects a request whose signature does not match", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService();

    const headers = signedHeaders(tenantId, principalId);
    headers["x-sync-signature"] = "deadbeef";

    const res = await fetch(`${base}${CONNECTIONS_PATH}`, { headers });

    expect(res.status).toBe(401);
  });

  it("serves reads in passive mode (they touch no provider)", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await seedConnection(repo, tenantId, principalId, "passive@example.com");
    await startService(testConfig({ EXECUTION: "passive" }));

    const res = await fetch(`${base}${CONNECTIONS_PATH}`, {
      headers: signedHeaders(tenantId, principalId),
    });

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as { connections: unknown[] }).connections,
    ).toHaveLength(1);
  });
});

describe("DELETE /internal/connections/:id", () => {
  let mongo: SyncMongoService;
  let connections: ProviderConnectionRepository;
  let credentials: CredentialRepository;
  let service: SyncService;
  let base: string;
  let adapter: FakeAuthAdapter;

  const activeConfig = () => testConfig({ EXECUTION: "active" });

  const startService = async (
    config: SyncConfig,
    authAdapter?: ProviderAuthAdapter,
  ) => {
    service = createSyncService(config, { mongo, authAdapter });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `disconnect_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
    connections = new ProviderConnectionRepository(mongo.db);
    credentials = new CredentialRepository(mongo.db);
    adapter = new FakeAuthAdapter();
  });

  afterEach(async () => {
    await service?.stop();
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  const seedConnected = async (tenantId: string, principalId: string) => {
    const connection = await seedConnection(
      connections,
      tenantId,
      principalId,
      "connected@example.com",
    );
    await credentials.store({
      connectionId: connection._id,
      provider: "google",
      refreshToken: "stored-refresh-token",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    return connection._id;
  };

  it("revokes, deletes the credential, and marks the connection disconnected", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const id = await seedConnected(tenantId, principalId);
    await startService(activeConfig(), adapter);

    const res = await fetch(`${base}${CONNECTIONS_PATH}/${id}`, {
      method: "DELETE",
      headers: signedHeaders(tenantId, principalId),
    });

    expect(res.status).toBe(204);
    expect(adapter.revoked).toEqual(["stored-refresh-token"]);
    expect(await credentials.findByConnection(id)).toBeNull();
    const after = await connections.findById(
      tenantId as never,
      principalId as never,
      id,
    );
    expect(after?.state).toBe("disconnected");
    expect(after?.disconnectedAt).toBeInstanceOf(Date);
  });

  it("refuses to disconnect in passive mode rather than half-disconnecting", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const id = await seedConnected(tenantId, principalId);
    await startService(testConfig({ EXECUTION: "passive" }), adapter);

    const res = await fetch(`${base}${CONNECTIONS_PATH}/${id}`, {
      method: "DELETE",
      headers: signedHeaders(tenantId, principalId),
    });

    expect(res.status).toBe(409);
    // Nothing was revoked or deleted.
    expect(adapter.revoked).toEqual([]);
    expect(await credentials.findByConnection(id)).not.toBeNull();
  });

  it("returns 404 for a connection the principal does not own, revoking nothing", async () => {
    const tenantId = objectId();
    const owner = objectId();
    const stranger = objectId();
    const id = await seedConnected(tenantId, owner);
    await startService(activeConfig(), adapter);

    const res = await fetch(`${base}${CONNECTIONS_PATH}/${id}`, {
      method: "DELETE",
      headers: signedHeaders(tenantId, stranger),
    });

    expect(res.status).toBe(404);
    expect(adapter.revoked).toEqual([]);
    expect(await credentials.findByConnection(id)).not.toBeNull();
  });

  it("rejects a malformed connection id", async () => {
    await startService(activeConfig(), adapter);

    const res = await fetch(`${base}${CONNECTIONS_PATH}/not-an-object-id`, {
      method: "DELETE",
      headers: signedHeaders(objectId(), objectId()),
    });

    expect(res.status).toBe(400);
  });

  it("rejects an unsigned disconnect", async () => {
    await startService(activeConfig(), adapter);

    const res = await fetch(
      `${base}${CONNECTIONS_PATH}/${objectId() as ConnectionId}`,
      { method: "DELETE" },
    );

    expect(res.status).toBe(401);
  });
});

describe("POST /internal/connections/begin", () => {
  let mongo: SyncMongoService;
  let connections: ProviderConnectionRepository;
  let service: SyncService;
  let base: string;
  let adapter: FakeAuthAdapter;

  const activeConfig = () => testConfig({ EXECUTION: "active" });

  const startService = async (
    config: SyncConfig,
    authAdapter?: ProviderAuthAdapter,
  ) => {
    service = createSyncService(config, { mongo, authAdapter });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  const begin = (
    tenantId: string,
    principalId: string,
    body?: Record<string, unknown>,
  ) =>
    fetch(`${base}${BEGIN_PATH}`, {
      method: "POST",
      headers: {
        ...signedHeaders(tenantId, principalId),
        "content-type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `begin_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
    connections = new ProviderConnectionRepository(mongo.db);
    adapter = new FakeAuthAdapter();
  });

  afterEach(async () => {
    await service?.stop();
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  it("returns a consent url whose state binds the flow to the caller", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService(activeConfig(), adapter);

    const res = await begin(tenantId, principalId);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { authorizationUrl: string };
    const { state, redirectUri } = adapter.authorizations[0];
    expect(body.authorizationUrl).toContain(state);
    expect(redirectUri).toBe(`http://localhost:3010${OAUTH_CALLBACK_PATH}`);

    const verified = verifyOAuthState(SECRET, state, Date.now());
    expect(verified.ok && verified.payload.principalId).toBe(principalId);
    expect(verified.ok && verified.payload.tenantId).toBe(tenantId);
    expect(verified.ok && verified.payload.connectionId).toBeNull();
  });

  it("binds the state to an owned connection for reconnect", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const existing = await seedConnection(
      connections,
      tenantId,
      principalId,
      "reconnect@example.com",
    );
    await startService(activeConfig(), adapter);

    const res = await begin(tenantId, principalId, {
      connectionId: existing._id,
    });

    expect(res.status).toBe(200);
    const { state } = adapter.authorizations[0];
    const verified = verifyOAuthState(SECRET, state, Date.now());
    expect(verified.ok && verified.payload.connectionId).toBe(existing._id);
  });

  it("refuses to reconnect a connection the principal does not own", async () => {
    const tenantId = objectId();
    const owner = objectId();
    const stranger = objectId();
    const existing = await seedConnection(
      connections,
      tenantId,
      owner,
      "owner@example.com",
    );
    await startService(activeConfig(), adapter);

    const res = await begin(tenantId, stranger, {
      connectionId: existing._id,
    });

    expect(res.status).toBe(404);
    expect(adapter.authorizations).toHaveLength(0);
  });

  it("rejects a malformed reconnect connection id", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService(activeConfig(), adapter);

    const res = await begin(tenantId, principalId, { connectionId: "nope" });

    expect(res.status).toBe(400);
  });

  it("refuses to begin in passive mode", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService(testConfig({ EXECUTION: "passive" }), adapter);

    const res = await begin(tenantId, principalId);

    expect(res.status).toBe(409);
    expect(adapter.authorizations).toHaveLength(0);
  });

  it("rejects an unsigned begin", async () => {
    await startService(activeConfig(), adapter);

    const res = await fetch(`${base}${BEGIN_PATH}`, { method: "POST" });

    expect(res.status).toBe(401);
  });
});
