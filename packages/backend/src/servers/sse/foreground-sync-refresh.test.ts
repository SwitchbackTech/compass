import { faker } from "@faker-js/faker";
import { FakeScheduler } from "@backend/__tests__/helpers/fake-scheduler";
import {
  ForegroundSyncRefresh,
  type ForegroundSyncRefreshDeps,
} from "@backend/servers/sse/foreground-sync-refresh";

describe("ForegroundSyncRefresh", () => {
  it("refreshes each connected principal once per backend tick", async () => {
    const users = [
      faker.database.mongodbObjectId(),
      faker.database.mongodbObjectId(),
    ];
    const calls: string[] = [];
    const scheduler = new FakeScheduler();
    const deps: ForegroundSyncRefreshDeps = {
      sse: { connectedUserIds: () => users },
      client: {
        refreshForegroundConnections: async (principalIds) => {
          calls.push(...principalIds);
          return {
            ok: true,
            value: { enqueued: 0, inFlight: 0, resources: 0 },
            correlationId: "correlation-id",
          };
        },
      },
    };
    const refresh = new ForegroundSyncRefresh(deps, {
      intervalMs: 30_000,
      schedule: scheduler.schedule,
    });

    refresh.start();
    expect(scheduler.delays).toEqual([30_000]);
    await scheduler.fireNext();

    expect(calls).toEqual(users);
    expect(scheduler.delays).toEqual([30_000]);
    refresh.stop();
    expect(scheduler.pending).toEqual([]);
  });

  it("does no Sync work when nobody is connected", async () => {
    const scheduler = new FakeScheduler();
    let calls = 0;
    const refresh = new ForegroundSyncRefresh(
      {
        sse: { connectedUserIds: () => [] },
        client: {
          refreshForegroundConnections: async () => {
            calls += 1;
            throw new Error("unexpected call");
          },
        },
      },
      { intervalMs: 10, schedule: scheduler.schedule },
    );

    refresh.start();
    await scheduler.fireNext();
    expect(calls).toBe(0);
    refresh.stop();
  });

  it("chunks large connected populations to the Sync contract bound", async () => {
    const scheduler = new FakeScheduler();
    const users = Array.from({ length: 501 }, () =>
      faker.database.mongodbObjectId(),
    );
    const batchSizes: number[] = [];
    const refresh = new ForegroundSyncRefresh(
      {
        sse: { connectedUserIds: () => users },
        client: {
          refreshForegroundConnections: async (principalIds) => {
            batchSizes.push(principalIds.length);
            return {
              ok: true,
              value: { enqueued: 0, inFlight: 0, resources: 0 },
              correlationId: "correlation-id",
            };
          },
        },
      },
      { intervalMs: 10, schedule: scheduler.schedule },
    );

    refresh.start();
    await scheduler.fireNext();
    expect(batchSizes).toEqual([500, 1]);
    refresh.stop();
  });
});
