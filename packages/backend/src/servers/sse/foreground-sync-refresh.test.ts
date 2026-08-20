import { faker } from "@faker-js/faker";
import {
  ForegroundSyncRefresh,
  type ForegroundSyncRefreshDeps,
} from "@backend/servers/sse/foreground-sync-refresh";

class FakeScheduler {
  pending: Array<{ delayMs: number; tick: () => void }> = [];

  schedule = (tick: () => void, delayMs: number): { clear: () => void } => {
    const entry = { delayMs, tick };
    this.pending.push(entry);
    return {
      clear: () => {
        this.pending = this.pending.filter((item) => item !== entry);
      },
    };
  };

  async fireNext(): Promise<void> {
    const entry = this.pending.shift();
    if (!entry) throw new Error("no tick scheduled");
    entry.tick();
    await Bun.sleep(0);
  }
}

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
    expect(scheduler.pending.map((entry) => entry.delayMs)).toEqual([30_000]);
    await scheduler.fireNext();

    expect(calls).toEqual(users);
    expect(scheduler.pending.map((entry) => entry.delayMs)).toEqual([30_000]);
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
