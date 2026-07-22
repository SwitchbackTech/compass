// The scheduler drains the job queue continuously: it repeatedly asks a worker
// to drain, sleeping a poll interval only when the queue is empty so a busy
// queue is worked without idle latency. It owns no sync logic — that lives in
// the worker/dispatch — only the loop and its graceful lifecycle.

// The slice of the worker the loop drives. Kept minimal so the scheduler is
// testable with a fake and never reaches into sync internals.
export interface JobDrainer {
  drain(max?: number): Promise<number>;
}

// The slice of the job store the scheduler needs to release its lease on stop.
export interface OwnedJobReleaser {
  releaseOwned(owner: string): Promise<number>;
}

export interface SyncSchedulerDeps {
  worker: JobDrainer;
  jobs: OwnedJobReleaser;
}

export interface SyncSchedulerOptions {
  // The lease owner this scheduler's worker claims under; its held jobs are
  // released back to pending on stop so a restart picks them up immediately.
  owner: string;
  // How long to wait between drains when the queue is empty. A busy drain loops
  // with no wait, so this only bounds idle-poll latency (the missed-webhook
  // fallback cadence is a separate, longer reconcile — a later slice).
  pollMs?: number;
  // Where a drain error goes. The loop never dies on one; it logs and continues.
  onError?: (error: unknown) => void;
}

const DEFAULT_POLL_MS = 5_000;

export class SyncScheduler {
  readonly #worker: JobDrainer;
  readonly #jobs: OwnedJobReleaser;
  readonly #owner: string;
  readonly #pollMs: number;
  readonly #onError: (error: unknown) => void;

  #running = false;
  #loop: Promise<void> | null = null;
  #wake: (() => void) | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: SyncSchedulerDeps, options: SyncSchedulerOptions) {
    this.#worker = deps.worker;
    this.#jobs = deps.jobs;
    this.#owner = options.owner;
    this.#pollMs = options.pollMs ?? DEFAULT_POLL_MS;
    this.#onError = options.onError ?? (() => {});
  }

  // Begin draining. Idempotent: a second call while running is a no-op, so one
  // scheduler never spawns two loops.
  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#loop = this.#run();
  }

  // Stop draining and release this worker's held jobs. Waits for an in-flight
  // drain to finish BEFORE releasing (releaseOwned's precondition: no handler
  // may still be running, or a just-finished job could be flipped back to
  // pending and reprocessed). Idempotent and safe to call when never started.
  async stop(): Promise<void> {
    this.#running = false;
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    // Resolve a pending idle wait so the loop notices #running is false at once
    // instead of sleeping out the poll interval.
    this.#wake?.();
    this.#wake = null;
    if (this.#loop) await this.#loop;
    this.#loop = null;
    await this.#jobs.releaseOwned(this.#owner);
  }

  async #run(): Promise<void> {
    while (this.#running) {
      let processed = 0;
      try {
        processed = await this.#worker.drain();
      } catch (error) {
        // A drain failure must never kill the loop; surface it and keep going.
        this.#onError(error);
      }
      if (!this.#running) break;
      // Loop immediately while there is work; otherwise wait a poll interval.
      await this.#idle(processed > 0 ? 0 : this.#pollMs);
    }
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
