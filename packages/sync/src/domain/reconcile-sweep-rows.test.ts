import {
  type ProviderCapability,
  type ProviderKind,
} from "@core/types/sync/identity.contracts";
import {
  RECONCILE_STALE_AFTER_MS_DEFAULT,
  SyncConfigSchema,
} from "@sync/config/sync.config";
import {
  buildReconcileSweepRows,
  pollOnlyProviderKinds,
} from "@sync/domain/reconcile-sweep-rows";
import { SweepScheduler } from "@sync/domain/sweep-scheduler.service";
import {
  type ProviderRegistration,
  ProviderRegistry,
} from "@sync/providers/provider-registry";

function fakeRegistration(
  capabilities: readonly ProviderCapability[],
): ProviderRegistration {
  return {
    adapters: {} as ProviderRegistration["adapters"],
    scopes: { forFeatures: () => [] },
    capabilities,
    callbackPath: "/sync/test",
    notificationsCallbackPath: "/sync/notifications/test",
    capabilitiesFromScopes: () => [...capabilities],
  };
}

function fakeRegistry(
  entries: Partial<Record<ProviderKind, readonly ProviderCapability[]>>,
): ProviderRegistry {
  const registrations = new Map<ProviderKind, ProviderRegistration>();
  for (const kind of Object.keys(entries) as ProviderKind[]) {
    const capabilities = entries[kind];
    if (capabilities) {
      registrations.set(kind, fakeRegistration(capabilities));
    }
  }
  return new ProviderRegistry(registrations);
}

describe("buildReconcileSweepRows", () => {
  const baseConfig = SyncConfigSchema.parse({
    NODE_ENV: "development",
    MONGO_URI: "mongodb://localhost/compass_sync",
    INTERNAL_AUTH_TOKEN: "token",
    CALLBACK_BASE_URL: "http://localhost:3010",
  });

  it("returns one default row when every registered provider supports push", () => {
    const registry = fakeRegistry({
      google: ["readEvents", "changeNotifications"],
    });

    expect(buildReconcileSweepRows(registry, baseConfig)).toEqual([
      {
        name: "reconcile",
        windowMs: -RECONCILE_STALE_AFTER_MS_DEFAULT,
        listOptions: {},
      },
    ]);
  });

  it("splits poll-only providers into dedicated rows with distinct cadence", () => {
    const config = SyncConfigSchema.parse({
      ...baseConfig,
      reconcileStaleAfterMsByKind: { apple: 90_000 },
      reconcileSweepIntervalMsByKind: { apple: 60_000 },
    });
    const registry = fakeRegistry({
      google: ["readEvents", "changeNotifications"],
      apple: ["readEvents", "incrementalChanges"],
    });

    const rows = buildReconcileSweepRows(registry, config);

    expect(pollOnlyProviderKinds(registry)).toEqual(["apple"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "reconcile",
      windowMs: -RECONCILE_STALE_AFTER_MS_DEFAULT,
      listOptions: { excludeProviders: ["apple"] },
    });
    expect(rows[1]).toMatchObject({
      name: "reconcile-apple",
      windowMs: -90_000,
      intervalMs: 60_000,
      listOptions: { provider: "apple" },
    });
    expect(rows[0]?.intervalMs).not.toBe(rows[1]?.intervalMs);
  });

  it("runs default and poll-only reconcile schedulers on separate intervals", async () => {
    const config = SyncConfigSchema.parse({
      ...baseConfig,
      reconcileSweepIntervalMsByKind: { apple: 30_000 },
    });
    const registry = fakeRegistry({
      google: ["readEvents", "changeNotifications"],
      apple: ["readEvents"],
    });
    const rows = buildReconcileSweepRows(registry, config);
    const ran: string[] = [];

    for (const row of rows) {
      const scheduler = new SweepScheduler(
        {
          sweep: async () => {
            ran.push(row.name);
            return 0;
          },
        },
        {
          intervalMs: row.intervalMs ?? 600_000,
          random: () => 0,
        },
      );
      scheduler.start();
      await scheduler.stop();
    }

    expect(ran).toEqual(["reconcile", "reconcile-apple"]);
    expect(rows.map((row) => row.intervalMs ?? 600_000)).toEqual([
      600_000, 30_000,
    ]);
  });
});
