import { ReconcileScheduler } from "@sync/domain/reconcile-scheduler.service";

const now = () => new Date("2026-07-10T00:00:00.000Z");

// Records each sweep's `before` argument and resolves a promise the test can
// await, so the test advances exactly when a sweep happens — no arbitrary timers.
class FakeSweeper {
  calls: Date[] = [];
  #waiters: Array<() => void> = [];
  #throwOnCall: number | null;

  constructor(throwOnCall: number | null = null) {
    this.#throwOnCall = throwOnCall;
  }
  sweep = async (before: Date): Promise<number> => {
    this.calls.push(before);
    const call = this.calls.length;
    for (const w of this.#waiters.splice(0)) w();
    if (this.#throwOnCall === call) throw new Error("sweep failed");
    return 0;
  };
  nextSweep(): Promise<void> {
    return new Promise((resolve) => this.#waiters.push(resolve));
  }
}

describe("ReconcileScheduler", () => {
  it("sweeps immediately on start, then again after the interval", async () => {
    const sweeper = new FakeSweeper();
    const scheduler = new ReconcileScheduler(
      { sweep: sweeper.sweep },
      { intervalMs: 5, jitterRatio: 0, staleAfterMs: 60_000, now },
    );

    const secondSweep = (async () => {
      await sweeper.nextSweep(); // first (immediate)
      await sweeper.nextSweep(); // second (after the 5ms interval)
    })();
    scheduler.start();
    await secondSweep;
    await scheduler.stop();

    expect(sweeper.calls.length).toBeGreaterThanOrEqual(2);
    // The sweep is asked for resources stale as of now - staleAfterMs.
    expect(sweeper.calls[0]).toEqual(new Date("2026-07-09T23:59:00.000Z"));
  });

  it("stops the loop and is safe to stop when never started", async () => {
    const sweeper = new FakeSweeper();
    const scheduler = new ReconcileScheduler(
      { sweep: sweeper.sweep },
      { intervalMs: 10_000, jitterRatio: 0, now },
    );

    await scheduler.stop(); // never started: no-op, no throw

    const firstSweep = sweeper.nextSweep();
    scheduler.start();
    await firstSweep;
    await scheduler.stop();

    // No sweeps happen after stop resolves (the 10s next-interval timer is cleared).
    const callsAtStop = sweeper.calls.length;
    await new Promise((r) => setTimeout(r, 0));
    expect(sweeper.calls.length).toBe(callsAtStop);
  });

  it("keeps sweeping after one throws", async () => {
    const errors: unknown[] = [];
    const sweeper = new FakeSweeper(1); // first sweep throws
    const scheduler = new ReconcileScheduler(
      { sweep: sweeper.sweep },
      { intervalMs: 1, jitterRatio: 0, now, onError: (e) => errors.push(e) },
    );

    const secondSweep = (async () => {
      await sweeper.nextSweep();
      await sweeper.nextSweep();
    })();
    scheduler.start();
    await secondSweep;
    await scheduler.stop();

    expect(errors).toHaveLength(1);
    expect(sweeper.calls.length).toBeGreaterThanOrEqual(2);
  });
});
