import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import dayjs from "@core/util/date/dayjs";
import { createSyncService, type SyncService } from "@sync/app";
import { signInternalRequest } from "@sync/auth/internal-auth";
import { type SyncConfig } from "@sync/config/sync.config";
import {
  deriveOAuthStateSecret,
  signOAuthState,
  verifyOAuthState,
} from "@sync/oauth/oauth-state";
import {
  type ProviderAuthAdapter,
  type ProviderAuthorization,
  type RefreshedCredential,
} from "@sync/providers/provider-auth.port";
import {
  BEGIN_PATH,
  CALENDARS_PATH,
  CONNECTIONS_PATH,
  EVENTS_PATH,
  OAUTH_CALLBACK_PATH,
} from "@sync/server/connection.routes";
import {
  type EventOccurrenceRecord,
  EventOccurrenceRecordSchema,
} from "@sync/storage/contracts/event-occurrence.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { type AddressInfo } from "node:net";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();
const SECRET = "internal-secret";
// The service signs OAuth state with a key derived from the root secret.
const STATE_SECRET = deriveOAuthStateSecret(SECRET);

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
  exchanges: Array<{ code: string; redirectUri: string }> = [];
  exchangeResult: ProviderAuthorization = {
    account: {
      providerAccountId: "google-sub-1",
      email: "connected@example.com",
      displayName: "Connected User",
    },
    refreshToken: "granted-refresh-token",
    grantedScopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  };
  exchangeError?: unknown;
  async exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<ProviderAuthorization> {
    this.exchanges.push(input);
    if (this.exchangeError) throw this.exchangeError;
    return this.exchangeResult;
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

    const verified = verifyOAuthState(STATE_SECRET, state, Date.now());
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
    const verified = verifyOAuthState(STATE_SECRET, state, Date.now());
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

describe("GET /oauth/google/callback", () => {
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

  const validState = (tenantId: string, principalId: string) =>
    signOAuthState(deriveOAuthStateSecret(SECRET), {
      tenantId: tenantId as TenantId,
      principalId: principalId as PrincipalId,
      connectionId: null,
      issuedAt: Date.now(),
    });

  const hitCallback = (query: string) =>
    fetch(`${base}${OAUTH_CALLBACK_PATH}?${query}`, { redirect: "manual" });

  const statusOf = (res: Response) =>
    new URL(res.headers.get("location") as string).searchParams.get("status");

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `callback_${objectId()}`,
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

  it("links the connection and stores the credential on a valid callback", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService(activeConfig(), adapter);

    const res = await hitCallback(
      `code=auth-code&state=${encodeURIComponent(validState(tenantId, principalId))}`,
    );

    expect(res.status).toBe(302);
    expect(statusOf(res)).toBe("connected");
    // The code was exchanged against the same redirect_uri begin would use.
    expect(adapter.exchanges[0].redirectUri).toBe(
      `http://localhost:3010${OAUTH_CALLBACK_PATH}`,
    );

    const linked = await connections.listByPrincipal(
      tenantId as TenantId,
      principalId as PrincipalId,
    );
    expect(linked).toHaveLength(1);
    expect(linked[0].account.providerAccountId).toBe("google-sub-1");
    expect(linked[0].state).toBe("importing");
    expect(linked[0].capabilities).toContain("writeEvents");

    const stored = await credentials.findByConnection(linked[0]._id);
    expect(stored?.refreshToken).toBe("granted-refresh-token");
  });

  it("redirects with an error and links nothing when the state is invalid", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService(activeConfig(), adapter);

    const res = await hitCallback("code=auth-code&state=forged.signature");

    expect(res.status).toBe(302);
    expect(statusOf(res)).toBe("error");
    expect(adapter.exchanges).toHaveLength(0);
    expect(
      await connections.listByPrincipal(
        tenantId as TenantId,
        principalId as PrincipalId,
      ),
    ).toHaveLength(0);
  });

  it("redirects with declined when the user rejects consent", async () => {
    await startService(activeConfig(), adapter);

    const res = await hitCallback("error=access_denied");

    expect(statusOf(res)).toBe("declined");
    expect(adapter.exchanges).toHaveLength(0);
  });

  // Reconnect: the state names a specific connection. The account Google
  // returns must match it, or a wrong-account consent would silently spawn a
  // second connection and leave the broken one stuck.
  const reconnectState = (
    tenantId: string,
    principalId: string,
    connectionId: string,
  ) =>
    signOAuthState(deriveOAuthStateSecret(SECRET), {
      tenantId: tenantId as TenantId,
      principalId: principalId as PrincipalId,
      connectionId: connectionId as ConnectionId,
      issuedAt: Date.now(),
    });

  it("re-authorizes the named connection when the account matches", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const existing = await seedConnection(
      connections,
      tenantId,
      principalId,
      "reauth@example.com",
    );
    // Google returns the same account the connection is tied to.
    adapter.exchangeResult = {
      ...adapter.exchangeResult,
      account: {
        providerAccountId: existing.account.providerAccountId,
        email: "reauth@example.com",
        displayName: null,
      },
    };
    await startService(activeConfig(), adapter);

    const res = await hitCallback(
      `code=c&state=${encodeURIComponent(reconnectState(tenantId, principalId, existing._id))}`,
    );

    expect(statusOf(res)).toBe("connected");
    // Still one connection — the same one, re-authorized, not a duplicate.
    const all = await connections.listByPrincipal(
      tenantId as TenantId,
      principalId as PrincipalId,
    );
    expect(all).toHaveLength(1);
    expect(all[0]._id).toBe(existing._id);
  });

  it("refuses and links nothing when reconnect consents with a different account", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const existing = await seedConnection(
      connections,
      tenantId,
      principalId,
      "original@example.com",
    );
    // Google returns a DIFFERENT account than the one being reconnected.
    adapter.exchangeResult = {
      ...adapter.exchangeResult,
      account: {
        providerAccountId: "some-other-google-sub",
        email: "other@example.com",
        displayName: null,
      },
    };
    await startService(activeConfig(), adapter);

    const res = await hitCallback(
      `code=c&state=${encodeURIComponent(reconnectState(tenantId, principalId, existing._id))}`,
    );

    expect(statusOf(res)).toBe("error");
    // No second connection was created; the original is untouched.
    const all = await connections.listByPrincipal(
      tenantId as TenantId,
      principalId as PrincipalId,
    );
    expect(all).toHaveLength(1);
    expect(all[0].account.providerAccountId).toBe(
      existing.account.providerAccountId,
    );
  });

  it("redirects with an error when the code exchange fails", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    adapter.exchangeError = new Error("bad code");
    await startService(activeConfig(), adapter);

    const res = await hitCallback(
      `code=bad&state=${encodeURIComponent(validState(tenantId, principalId))}`,
    );

    expect(statusOf(res)).toBe("error");
    expect(
      await connections.listByPrincipal(
        tenantId as TenantId,
        principalId as PrincipalId,
      ),
    ).toHaveLength(0);
  });

  it("refuses to complete a callback in passive mode", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await startService(testConfig({ EXECUTION: "passive" }), adapter);

    const res = await hitCallback(
      `code=auth-code&state=${encodeURIComponent(validState(tenantId, principalId))}`,
    );

    expect(statusOf(res)).toBe("error");
    expect(adapter.exchanges).toHaveLength(0);
  });
});

describe("GET /internal/calendars", () => {
  let mongo: SyncMongoService;
  let calendars: ProviderCalendarRepository;
  let service: SyncService;
  let base: string;

  const startService = async (config: SyncConfig = testConfig()) => {
    service = createSyncService(config, { mongo });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  const seedCalendar = (
    tenantId: string,
    principalId: string,
    overrides: {
      connectionId?: string;
      displayName?: string;
      active?: boolean;
    } = {},
  ) =>
    calendars.upsertByProviderCalendar({
      tenantId: tenantId as TenantId,
      principalId: principalId as PrincipalId,
      connectionId: (overrides.connectionId ?? objectId()) as ConnectionId,
      providerCalendarId: objectId(),
      displayName: overrides.displayName ?? "My Calendar",
      color: null,
      active: overrides.active ?? true,
      primary: false,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
    });

  const get = (tenantId: string, principalId: string, query = "") =>
    fetch(`${base}${CALENDARS_PATH}${query}`, {
      headers: signedHeaders(tenantId, principalId),
    });

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `cal_api_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  afterEach(async () => {
    await service?.stop();
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  it("returns the caller's calendars mapped to the wire contract", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await seedCalendar(tenantId, principalId, { displayName: "Work" });
    await startService();

    const res = await get(tenantId, principalId);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      calendars: Array<Record<string, unknown>>;
    };
    expect(body.calendars).toHaveLength(1);
    expect(body.calendars[0]).toMatchObject({
      principalId,
      displayName: "Work",
      accessRole: "owner",
    });
    expect(typeof body.calendars[0].createdAt).toBe("string");
  });

  it("scopes results to the authenticated principal", async () => {
    const tenantId = objectId();
    const mine = objectId();
    const other = objectId();
    await seedCalendar(tenantId, mine, { displayName: "Mine" });
    await seedCalendar(tenantId, other, { displayName: "Theirs" });
    await startService();

    const body = (await (await get(tenantId, mine)).json()) as {
      calendars: Array<{ displayName: string }>;
    };
    expect(body.calendars).toHaveLength(1);
    expect(body.calendars[0].displayName).toBe("Mine");
  });

  it("narrows to one connection when connectionId is given", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const conn = objectId();
    await seedCalendar(tenantId, principalId, { connectionId: conn });
    await seedCalendar(tenantId, principalId, { connectionId: objectId() });
    await startService();

    const body = (await (
      await get(tenantId, principalId, `?connectionId=${conn}`)
    ).json()) as { calendars: unknown[] };
    expect(body.calendars).toHaveLength(1);
  });

  it("returns only active calendars when activeOnly=true", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    await seedCalendar(tenantId, principalId, { active: true });
    await seedCalendar(tenantId, principalId, { active: false });
    await startService();

    const all = (await (await get(tenantId, principalId)).json()) as {
      calendars: unknown[];
    };
    const activeOnly = (await (
      await get(tenantId, principalId, "?activeOnly=true")
    ).json()) as { calendars: unknown[] };

    expect(all.calendars).toHaveLength(2);
    expect(activeOnly.calendars).toHaveLength(1);
  });

  it("rejects a malformed connectionId filter", async () => {
    await startService();

    const res = await get(objectId(), objectId(), "?connectionId=nope");

    expect(res.status).toBe(400);
  });

  it("rejects a repeated connectionId that Express parses as an array", async () => {
    await startService();
    const conn = objectId();

    const res = await get(
      objectId(),
      objectId(),
      `?connectionId=${conn}&connectionId=${objectId()}`,
    );

    expect(res.status).toBe(400);
  });

  it("rejects an unsigned request", async () => {
    await startService();

    const res = await fetch(`${base}${CALENDARS_PATH}`);

    expect(res.status).toBe(401);
  });
});

describe("GET /internal/events", () => {
  let mongo: SyncMongoService;
  let service: SyncService;
  let base: string;

  const startService = async (config: SyncConfig = testConfig()) => {
    service = createSyncService(config, { mongo });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  // Insert one occurrence directly, validated through the record schema so a
  // seed that violates the contract fails in the test rather than the route.
  const seedOccurrence = (
    tenantId: string,
    principalId: string,
    overrides: Partial<EventOccurrenceRecord> = {},
  ) => {
    const start = overrides.startAt ?? new Date();
    const record = EventOccurrenceRecordSchema.parse({
      _id: objectId(),
      tenantId,
      principalId,
      eventId: objectId(),
      occurrenceKey: `${objectId()}:${start.toISOString()}`,
      calendarId: objectId(),
      schedule: {
        kind: "timed",
        start: "2026-07-14T09:00:00-06:00",
        end: "2026-07-14T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      startAt: start,
      busy: true,
      title: "Standup",
      cancelled: false,
      generation: 0,
      ...overrides,
    });
    return mongo.db
      .collection<EventOccurrenceRecord>("event_occurrences")
      .insertOne(record);
  };

  // A range wide enough to include seeds placed at "now" without brushing the
  // horizon edges.
  const wideRange = () =>
    `start=${dayjs().subtract(1, "day").toISOString()}&end=${dayjs()
      .add(1, "day")
      .toISOString()}`;

  const get = (tenantId: string, principalId: string, query: string) =>
    fetch(`${base}${EVENTS_PATH}?${query}`, {
      headers: signedHeaders(tenantId, principalId),
    });

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `events_api_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
  });

  afterEach(async () => {
    await service?.stop();
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  it("returns occurrences mapped to the strict wire contract", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calendarId = objectId();
    await seedOccurrence(tenantId, principalId, {
      calendarId: calendarId as EventOccurrenceRecord["calendarId"],
    });
    await startService();

    const body = (await (
      await get(
        tenantId,
        principalId,
        `calendarIds=${calendarId}&${wideRange()}`,
      )
    ).json()) as { occurrences: Array<Record<string, unknown>> };

    expect(body.occurrences).toHaveLength(1);
    // Only the wire fields — never the storage-only scope/axis/generation.
    expect(Object.keys(body.occurrences[0]).sort()).toEqual([
      "busy",
      "calendarId",
      "cancelled",
      "eventId",
      "occurrenceKey",
      "schedule",
      "title",
    ]);
  });

  it("scopes results to the authenticated principal", async () => {
    const tenantId = objectId();
    const mine = objectId();
    const stranger = objectId();
    const calendarId = objectId();
    await seedOccurrence(tenantId, mine, {
      calendarId: calendarId as EventOccurrenceRecord["calendarId"],
      title: "Mine",
    });
    await seedOccurrence(tenantId, stranger, {
      calendarId: calendarId as EventOccurrenceRecord["calendarId"],
      title: "Theirs",
    });
    await startService();

    const body = (await (
      await get(tenantId, mine, `calendarIds=${calendarId}&${wideRange()}`)
    ).json()) as { occurrences: Array<{ title: string }> };

    expect(body.occurrences).toHaveLength(1);
    expect(body.occurrences[0].title).toBe("Mine");
  });

  it("returns every occurrence of a recurring series in range", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calendarId = objectId() as EventOccurrenceRecord["calendarId"];
    const eventId = objectId() as EventOccurrenceRecord["eventId"];
    await seedOccurrence(tenantId, principalId, {
      calendarId,
      eventId,
      occurrenceKey: `${eventId}:a` as EventOccurrenceRecord["occurrenceKey"],
      startAt: dayjs().subtract(2, "hour").toDate(),
    });
    await seedOccurrence(tenantId, principalId, {
      calendarId,
      eventId,
      occurrenceKey: `${eventId}:b` as EventOccurrenceRecord["occurrenceKey"],
      startAt: dayjs().subtract(1, "hour").toDate(),
    });
    await startService();

    const body = (await (
      await get(
        tenantId,
        principalId,
        `calendarIds=${calendarId}&${wideRange()}`,
      )
    ).json()) as { occurrences: Array<{ eventId: string }> };

    expect(body.occurrences).toHaveLength(2);
    expect(body.occurrences.every((o) => o.eventId === eventId)).toBe(true);
  });

  it("still returns a cancelled occurrence so the client can tombstone it", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calendarId = objectId() as EventOccurrenceRecord["calendarId"];
    await seedOccurrence(tenantId, principalId, {
      calendarId,
      cancelled: true,
    });
    await startService();

    const body = (await (
      await get(
        tenantId,
        principalId,
        `calendarIds=${calendarId}&${wideRange()}`,
      )
    ).json()) as { occurrences: Array<{ cancelled: boolean }> };

    expect(body.occurrences).toHaveLength(1);
    expect(body.occurrences[0].cancelled).toBe(true);
  });

  it("clamps the range to the sync horizon", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calendarId = objectId() as EventOccurrenceRecord["calendarId"];
    // One before the 12-month past horizon, one inside it.
    await seedOccurrence(tenantId, principalId, {
      calendarId,
      title: "AncientHistory",
      startAt: dayjs().subtract(15, "month").toDate(),
    });
    await seedOccurrence(tenantId, principalId, {
      calendarId,
      title: "RecentPast",
      startAt: dayjs().subtract(1, "month").toDate(),
    });
    await startService();

    // Ask for a range that reaches back before the horizon.
    const body = (await (
      await get(
        tenantId,
        principalId,
        `calendarIds=${calendarId}&start=${dayjs()
          .subtract(20, "month")
          .toISOString()}&end=${dayjs().add(1, "day").toISOString()}`,
      )
    ).json()) as { occurrences: Array<{ title: string }> };

    expect(body.occurrences.map((o) => o.title)).toEqual(["RecentPast"]);
  });

  it("keyset paginates across pages with an opaque cursor", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calendarId = objectId() as EventOccurrenceRecord["calendarId"];
    for (let i = 0; i < 3; i++) {
      await seedOccurrence(tenantId, principalId, {
        calendarId,
        title: `E${i}`,
        startAt: dayjs()
          .subtract(3 - i, "hour")
          .toDate(),
      });
    }
    await startService();

    const first = (await (
      await get(
        tenantId,
        principalId,
        `calendarIds=${calendarId}&${wideRange()}&limit=2`,
      )
    ).json()) as { occurrences: Array<{ title: string }>; nextCursor: string };
    expect(first.occurrences.map((o) => o.title)).toEqual(["E0", "E1"]);
    expect(first.nextCursor).toBeTruthy();

    const second = (await (
      await get(
        tenantId,
        principalId,
        `calendarIds=${calendarId}&${wideRange()}&limit=2&cursor=${encodeURIComponent(
          first.nextCursor,
        )}`,
      )
    ).json()) as { occurrences: Array<{ title: string }>; nextCursor: null };
    expect(second.occurrences.map((o) => o.title)).toEqual(["E2"]);
    expect(second.nextCursor).toBeNull();
  });

  it("rejects a malformed cursor", async () => {
    await startService();
    const badCursor = Buffer.from("notjson").toString("base64url");

    const res = await get(
      objectId(),
      objectId(),
      `calendarIds=${objectId()}&${wideRange()}&cursor=${badCursor}`,
    );

    expect(res.status).toBe(400);
  });

  it("rejects a query with no calendarIds", async () => {
    await startService();

    const res = await get(objectId(), objectId(), wideRange());

    expect(res.status).toBe(400);
  });

  it("rejects a range whose end is not after its start", async () => {
    await startService();
    const now = dayjs().toISOString();

    const res = await get(
      objectId(),
      objectId(),
      `calendarIds=${objectId()}&start=${now}&end=${now}`,
    );

    expect(res.status).toBe(400);
  });

  it("rejects an unsigned request", async () => {
    await startService();

    const res = await fetch(`${base}${EVENTS_PATH}?calendarIds=${objectId()}`);

    expect(res.status).toBe(401);
  });
});
