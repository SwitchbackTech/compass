import { PollLoop } from "@sync/domain/poll-loop";

// Periodically runs a sweep on a jittered interval. It owns only the timer and
// its lifecycle (via PollLoop); the sweep itself (find due resources, enqueue
// jobs) is injected, so this is testable without repositories or real time.
// Both the reconcile fallback and subscription maintenance drive their sweeps
// through it.

export interface SweepSchedulerDeps {
  // Run one sweep for the cutoff instant `before`; returns how many it enqueued.
  // Bound to a concrete sweep (reconcileStaleCalendars, maintainExpiringSubscriptions)
  // + repositories by the caller.
  sweep: (before: Date) => Promise<number>;
}

export interface SweepSchedulerOptions {
  // Base gap between sweeps. The ledger's fallback cadence is ~10 minutes.
  intervalMs?: number;
  // Jitter as a fraction of the interval (each wait is interval * (1 ± this)),
  // so replicas do not all sweep in lockstep and hammer the store together.
  jitterRatio?: number;
  // Signed offset from now that defines each sweep's cutoff: before = now + windowMs.
  // NEGATIVE looks BACK (reconcile: resources not synced since now - 15m).
  // POSITIVE looks AHEAD (subscription: channels expiring before now + 24h).
  windowMs?: number;
  now?: () => Date;
  // Injectable [0,1) source so a test can pin the jitter; defaults to Math.random.
  random?: () => number;
  // A sweep error must never kill the loop; it is surfaced here and the loop
  // continues to the next interval.
  onError?: (error: unknown) => void;
}

const DEFAULT_INTERVAL_MS = 10 * 60_000;
const DEFAULT_JITTER_RATIO = 0.2;

export class SweepScheduler {
  readonly #loop: PollLoop;

  constructor(deps: SweepSchedulerDeps, options: SweepSchedulerOptions = {}) {
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;
    const windowMs = options.windowMs ?? 0;
    const now = options.now ?? (() => new Date());
    const random = options.random ?? Math.random;

    // interval * (1 ± jitterRatio).
    const nextIntervalMs = (): number => {
      const swing = jitterRatio * (random() * 2 - 1);
      return Math.max(0, Math.round(intervalMs * (1 + swing)));
    };

    this.#loop = new PollLoop({
      tick: async () => {
        const before = new Date(now().getTime() + windowMs);
        await deps.sweep(before);
        // A sweep always waits the same jittered interval regardless of how
        // much it found, so "did work" plays no part in its own delay.
        return false;
      },
      nextDelayMs: () => nextIntervalMs(),
      onError: options.onError,
    });
  }

  // Begin sweeping. Runs a sweep immediately (so a restart promptly catches
  // anything missed while down), then on jittered intervals. Idempotent.
  start(): void {
    this.#loop.start();
  }

  // Stop sweeping. Waits for an in-flight sweep to finish so nothing is torn
  // down mid-enqueue. Idempotent and safe when never started.
  async stop(): Promise<void> {
    await this.#loop.stop();
  }
}
