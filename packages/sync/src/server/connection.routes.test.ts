import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { createSyncService, type SyncService } from "@sync/app";
import { signInternalRequest } from "@sync/auth/internal-auth";
import { type SyncConfig } from "@sync/config/sync.config";
import { CONNECTIONS_PATH } from "@sync/server/connection.routes";
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

  const startService = async (config: SyncConfig = testConfig()) => {
    service = createSyncService(config, { mongo });
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
