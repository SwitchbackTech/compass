import { faker } from "@faker-js/faker";
import { NodeEnv } from "@core/constants/core.constants";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { assertNoSafetyCanary } from "@sync/safety/safety-canary";
import { buildServiceIdentity } from "@sync/service-identity";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import {
  computeHealthSnapshot,
  emitHealthSnapshot,
  HEALTH_SUBSCRIPTION_RENEW_BEFORE_MS,
} from "@sync/telemetry/health-snapshot.service";
import { type PostHogCaptureClient } from "@sync/telemetry/posthog-capture";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();
const NOW = new Date("2026-07-25T02:00:00.000Z");

describe("computeHealthSnapshot", () => {
  const storage = setupSyncStorage(import.meta.url);
  let connections: ProviderConnectionRepository;
  let resources: SyncResourceRepository;
  let jobs: JobRepository;

  beforeEach(() => {
    connections = new ProviderConnectionRepository(storage.db());
    resources = new SyncResourceRepository(storage.db());
    jobs = new JobRepository(storage.db());
  });

  const identity = buildServiceIdentity({
    environment: NodeEnv.Test,
    execution: "passive",
  });

  const deps = () => ({
    mongo: storage.mongo(),
    identity,
    now: () => NOW,
  });

  const seedConnection = (
    state: "healthy" | "delayed" | "actionRequired" | "disconnected",
  ) =>
    connections.upsertByProviderAccount({
      tenantId: objectId() as TenantId,
      principalId: objectId() as PrincipalId,
      provider: "google",
      account: {
        providerAccountId: objectId(),
        email: "h@example.com",
        displayName: null,
      },
      capabilities: ["readEvents"],
      state,
      stateReason: state === "actionRequired" ? "authorizationRevoked" : null,
    });

  it("aggregates connection states, jobs, subscriptions, and freshness", async () => {
    await seedConnection("healthy");
    await seedConnection("healthy");
    await seedConnection("delayed");
    await seedConnection("disconnected");

    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const healthySub = await resources.ensure({
      tenantId,
      principalId,
      connectionId,
      resourceKind: "events",
      calendarId: objectId() as never,
    });
    await resources.updateSubscription(tenantId, principalId, healthySub._id, {
      subscriptionId: "ch-healthy",
      subscriptionResourceId: "res-1",
      subscriptionToken: "tok-1",
      subscriptionExpiresAt: new Date(
        NOW.getTime() + HEALTH_SUBSCRIPTION_RENEW_BEFORE_MS + 60_000,
      ),
    });
    await resources.advanceCursor(
      tenantId,
      principalId,
      healthySub._id,
      "cursor",
      new Date(NOW.getTime() - 5_000),
    );

    const missing = await resources.ensure({
      tenantId,
      principalId,
      connectionId,
      resourceKind: "events",
      calendarId: objectId() as never,
    });
    await resources.advanceCursor(
      tenantId,
      principalId,
      missing._id,
      "cursor",
      new Date(NOW.getTime() - 60_000),
    );

    await jobs.enqueue({
      tenantId,
      principalId,
      connectionId,
      resourceId: null,
      commandId: null,
      kind: "incrementalPull",
      priority: 0,
      runAfter: new Date(NOW.getTime() - 15_000),
      coalescingKey: `pull:${objectId()}`,
    });

    const snapshot = await computeHealthSnapshot(deps());

    expect(snapshot.service).toBe("compass-sync");
    expect(snapshot.provider).toBe("google");
    expect(snapshot.connections.healthy).toBe(2);
    expect(snapshot.connections.delayed).toBe(1);
    expect(snapshot.connections.disconnected).toBe(1);
    expect(snapshot.jobs.pending).toBe(1);
    expect(snapshot.jobs.oldestDueAgeMs).toBe(15_000);
    expect(snapshot.subscriptions.healthy).toBe(1);
    expect(snapshot.subscriptions.missing).toBe(1);
    // The subscribed resource in this fixture has no changeNotifiedAt, so it
    // counts as never notified — the signal that push delivery is broken.
    expect(snapshot.subscriptions.neverNotified).toBe(1);
    expect(snapshot.freshness.sampleSize).toBe(2);
    expect(snapshot.freshness.p50Ms).toBeGreaterThan(0);
    expect(snapshot.freshness.percentOver30s).toBeGreaterThan(0);
    expect(snapshot.computedAt).toBe(NOW.toISOString());

    // R-SEC-04 / S44: aggregates must never carry content or credential shapes.
    assertNoSafetyCanary(snapshot);
  });

  it("emits through PostHog when a client is configured", async () => {
    const captured: Array<{
      event: string;
      properties: Record<string, unknown>;
    }> = [];
    const client: PostHogCaptureClient = {
      capture: async ({ event, properties }) => {
        captured.push({ event, properties });
      },
      shutdown: async () => {},
    };

    const snapshot = await emitHealthSnapshot({ deps: deps(), client });

    expect(captured).toHaveLength(1);
    expect(captured[0]?.event).toBe("sync_health_snapshot");
    expect(captured[0]?.properties["service"]).toBe("compass-sync");
    expect(snapshot.connections.healthy).toBe(0);
    assertNoSafetyCanary(captured[0]?.properties);
  });

  it("still computes when PostHog is not configured", async () => {
    const snapshot = await emitHealthSnapshot({ deps: deps(), client: null });
    expect(snapshot.service).toBe("compass-sync");
  });
});
