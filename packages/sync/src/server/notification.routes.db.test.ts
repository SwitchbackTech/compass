import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { createSyncService, type SyncService } from "@sync/app";
import { type SyncConfig } from "@sync/config/sync.config";
import { NOTIFICATIONS_PATH } from "@sync/server/notification.routes";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";
import { type AddressInfo } from "node:net";

const uri = process.env["SYNC_MONGO_URI"] as string;
const storage = setupSyncStorage(import.meta.url);
const objectId = () => faker.database.mongodbObjectId();

const testConfig = (overrides: Partial<SyncConfig> = {}): SyncConfig =>
  ({
    NODE_ENV: NodeEnv.Test,
    PORT: 0,
    MONGO_URI: uri,
    INTERNAL_AUTH_TOKEN: "secret",
    CALLBACK_BASE_URL: "http://localhost:3010",
    EXECUTION: "active",
    MAX_CONCURRENCY: 4,
    ...overrides,
  }) as SyncConfig;

const CHANNEL = "chan-1";
const RESOURCE = "res-1";
const TOKEN = "channel-secret-token";

const googHeaders = (
  overrides: Record<string, string> = {},
): Record<string, string> => ({
  "x-goog-channel-id": CHANNEL,
  "x-goog-channel-token": TOKEN,
  "x-goog-resource-id": RESOURCE,
  "x-goog-resource-state": "exists",
  ...overrides,
});

describe("POST /sync/notifications/google", () => {
  let mongo: SyncMongoService;
  let resources: SyncResourceRepository;
  let service: SyncService;
  let base: string;

  const startService = async (config: SyncConfig = testConfig()) => {
    service = createSyncService(config, { mongo });
    await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
    const { port } = service.httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  };

  // Seed a synced resource with an active push subscription for CHANNEL.
  const seedSubscription = async (
    expiresAt = new Date(Date.now() + 60 * 60 * 1000),
    token = TOKEN,
    kind: "events" | "calendarList" = "events",
  ) => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const resource = await resources.ensure({
      tenantId,
      principalId,
      connectionId: objectId() as ConnectionId,
      resourceKind: kind,
      calendarId: kind === "events" ? objectId() : null,
    });
    await resources.updateSubscription(tenantId, principalId, resource._id, {
      subscriptionId: CHANNEL,
      subscriptionResourceId: RESOURCE,
      subscriptionToken: token,
      subscriptionExpiresAt: expiresAt,
    });
    return resource;
  };

  const post = (headers: Record<string, string>) =>
    fetch(`${base}${NOTIFICATIONS_PATH}`, { method: "POST", headers });

  const jobCount = (coalescingKey: string) =>
    mongo.db
      .collection(SYNC_COLLECTIONS.jobs)
      .countDocuments({ coalescingKey });

  beforeEach(() => {
    mongo = storage.mongo();
    resources = new SyncResourceRepository(mongo.db);
  });

  afterEach(async () => {
    await service?.stop();
  });

  it("enqueues one pull for an authentic change, coalescing duplicates", async () => {
    const { _id: resourceId } = await seedSubscription();
    await startService();

    const first = await post(googHeaders());
    const second = await post(googHeaders()); // duplicate delivery

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Both deliveries collapse to a single incrementalPull job.
    expect(await jobCount(`incrementalPull:${resourceId}`)).toBe(1);
  });

  it("stamps the change marker so a pull already in flight cannot miss the change", async () => {
    // The enqueue above no-ops whenever a job holds the coalescing key —
    // including the claimed row of a running pull that has already read the
    // provider. The marker is the only thing that survives that, and the pull's
    // compare-and-clear is what turns it back into a second pass.
    const { _id: resourceId } = await seedSubscription();
    await startService();

    const res = await post(googHeaders());

    expect(res.status).toBe(200);
    const stored = await mongo.db
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ _id: resourceId });
    expect(stored?.["changeNotifiedAt"]).toBeInstanceOf(Date);
  });

  it("does not stamp the change marker on a rejected notification", async () => {
    const { _id: resourceId } = await seedSubscription();
    await startService();

    await post(googHeaders({ "x-goog-channel-token": "wrong" }));

    const stored = await mongo.db
      .collection(SYNC_COLLECTIONS.syncResources)
      .findOne({ _id: resourceId });
    expect(stored?.["changeNotifiedAt"]).toBeNull();
  });

  it("does not enqueue on the initial sync handshake", async () => {
    const { _id: resourceId } = await seedSubscription();
    await startService();

    const res = await post(googHeaders({ "x-goog-resource-state": "sync" }));

    expect(res.status).toBe(200);
    expect(await jobCount(`incrementalPull:${resourceId}`)).toBe(0);
  });

  it("rejects a spoofed token: accepts the request but enqueues nothing", async () => {
    const { _id: resourceId } = await seedSubscription();
    await startService();

    const res = await post(googHeaders({ "x-goog-channel-token": "wrong" }));

    // 200 so a spoofer learns nothing and triggers no retry — but no work.
    expect(res.status).toBe(200);
    expect(await jobCount(`incrementalPull:${resourceId}`)).toBe(0);
  });

  it("enqueues nothing for an unknown channel", async () => {
    await startService();

    const res = await post(googHeaders({ "x-goog-channel-id": "unknown" }));

    expect(res.status).toBe(200);
    expect(
      await mongo.db.collection(SYNC_COLLECTIONS.jobs).countDocuments({}),
    ).toBe(0);
  });

  it("enqueues nothing for a resource-id that does not match the subscription", async () => {
    const { _id: resourceId } = await seedSubscription();
    await startService();

    const res = await post(googHeaders({ "x-goog-resource-id": "other-res" }));

    expect(res.status).toBe(200);
    expect(await jobCount(`incrementalPull:${resourceId}`)).toBe(0);
  });

  it("enqueues nothing once the subscription has expired", async () => {
    const { _id: resourceId } = await seedSubscription(
      new Date(Date.now() - 1000),
    );
    await startService();

    const res = await post(googHeaders());

    expect(res.status).toBe(200);
    expect(await jobCount(`incrementalPull:${resourceId}`)).toBe(0);
  });

  it("rejects a request with no recognizable notification headers", async () => {
    await startService();

    const res = await post({ "x-goog-resource-state": "exists" });

    expect(res.status).toBe(400);
  });

  it("enqueues calendarListSync for a calendar-list channel change, not a pull", async () => {
    const resource = await seedSubscription(
      new Date(Date.now() + 60 * 60 * 1000),
      TOKEN,
      "calendarList",
    );
    await startService();

    const res = await post(googHeaders());

    expect(res.status).toBe(200);
    expect(await jobCount(`calendarListSync:${resource.connectionId}`)).toBe(1);
    expect(await jobCount(`incrementalPull:${resource._id}`)).toBe(0);
  });

  it("accepts and drops notifications in passive mode", async () => {
    const { _id: resourceId } = await seedSubscription();
    await startService(testConfig({ EXECUTION: "passive" }));

    const res = await post(googHeaders());

    expect(res.status).toBe(200);
    expect(await jobCount(`incrementalPull:${resourceId}`)).toBe(0);
  });
});
