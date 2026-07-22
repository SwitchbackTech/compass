// Periodically runs the reconcile sweep (the missed-webhook fallback) on a
// jittered interval. It owns only the timer and its lifecycle; the sweep itself
// (find stale calendars, enqueue pulls) is injected, so this is testable without
// repositories or real time.

export interface ReconcileSchedulerDeps {
  // Run one sweep for resources not synced since `before`; returns how many it
  // enqueued. Bound to reconcileStaleCalendars + repositories by the caller.
  sweep: (before: Date) => Promise<number>;
}

export interface ReconcileSchedulerOptions {
  // Base gap between sweeps. The ledger's fallback cadence is ~10 minutes.
  intervalMs?: number;
  // Jitter as a fraction of the interval (each wait is interval * (1 ± this)),
  // so replicas do not all sweep in lockstep and hammer the store together.
  jitterRatio?: number;
  // A resource is stale if it has not synced within this window; each sweep asks
  // for resources whose last success is older than now - staleAfterMs.
  staleAfterMs?: number;
  now?: () => Date;
  // Injectable [0,1) source so a test can pin the jitter; defaults to Math.random.
  random?: () => number;
  // A sweep error must never kill the loop; it is surfaced here and the loop
  // continues to the next interval.
  onError?: (error: unknown) => void;
}

const DEFAULT_INTERVAL_MS = 10 * 60_000;
const DEFAULT_JITTER_RATIO = 0.2;
const DEFAULT_STALE_AFTER_MS = 15 * 60_000;

export class ReconcileScheduler {
  readonly #sweep: (before: Date) => Promise<number>;
  readonly #intervalMs: number;
  readonly #jitterRatio: number;
  readonly #staleAfterMs: number;
  readonly #now: () => Date;
  readonly #random: () => number;
  readonly #onError: (error: unknown) => void;

  #running = false;
  #loop: Promise<void> | null = null;
  #wake: (() => void) | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    deps: ReconcileSchedulerDeps,
    options: ReconcileSchedulerOptions = {},
  ) {
    this.#sweep = deps.sweep;
    this.#intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.#jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;
    this.#staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
    this.#now = options.now ?? (() => new Date());
    this.#random = options.random ?? Math.random;
    this.#onError = options.onError ?? (() => {});
  }

  // Begin sweeping. Runs a sweep immediately (so a restart promptly catches
  // anything missed while down), then on jittered intervals. Idempotent.
  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#loop = this.#run();
  }

  // Stop sweeping. Waits for an in-flight sweep to finish so nothing is torn
  // down mid-enqueue. Idempotent and safe when never started.
  async stop(): Promise<void> {
    this.#running = false;
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#wake?.();
    this.#wake = null;
    if (this.#loop) await this.#loop;
    this.#loop = null;
  }

  async #run(): Promise<void> {
    while (this.#running) {
      try {
        const before = new Date(this.#now().getTime() - this.#staleAfterMs);
        await this.#sweep(before);
      } catch (error) {
        this.#onError(error);
      }
      if (!this.#running) break;
      await this.#idle(this.#nextIntervalMs());
    }
  }

  // interval * (1 ± jitterRatio).
  #nextIntervalMs(): number {
    const swing = this.#jitterRatio * (this.#random() * 2 - 1);
    return Math.max(0, Math.round(this.#intervalMs * (1 + swing)));
  }

  #idle(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.#wake = resolve;
      this.#timer = setTimeout(() => {
        this.#wake = null;
        this.#timer = null;
        resolve();
      }, ms);
    });
  }
}
