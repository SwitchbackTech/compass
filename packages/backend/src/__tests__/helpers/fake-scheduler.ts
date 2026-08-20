import { type TickScheduler } from "@backend/servers/sse/tick-scheduler";

// Captures every scheduled tick without real timers; a test fires the next
// one explicitly, so ticks run deterministically and instantly.
export class FakeScheduler {
  pending: Array<{ delayMs: number; tick: () => void }> = [];

  schedule: TickScheduler = (tick, delayMs) => {
    const entry = { delayMs, tick };
    this.pending.push(entry);
    return {
      clear: () => {
        this.pending = this.pending.filter((e) => e !== entry);
      },
    };
  };

  get delays(): number[] {
    return this.pending.map((entry) => entry.delayMs);
  }

  // Run the next scheduled tick, then let the async tick body run to
  // completion (a macrotask turn drains the microtasks it queued).
  async fireNext(): Promise<void> {
    const entry = this.pending.shift();
    if (!entry) throw new Error("no tick scheduled");
    entry.tick();
    await Bun.sleep(0);
  }
}
