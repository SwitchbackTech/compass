import {
  dispatchSyncJob,
  type SyncJobDispatchDeps,
} from "@sync/domain/sync-job-dispatch.service";
import { type JobRecord } from "@sync/storage/contracts/job.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";

export interface SyncJobWorkerDeps extends SyncJobDispatchDeps {
  jobs: JobRepository;
}

export interface SyncJobWorkerOptions {
  // How long a claimed job's lease lasts. Generous by default: a heartbeat that
  // extends the lease of a long-running job is a later slice, so the lease alone
  // must outlast a normal import/pull/repair. A job that outlives its lease is
  // reclaimed and re-run — safe, because every engine is idempotent, just
  // wasteful.
  leaseMs?: number;
  // When to retry a job that asked to be retried, from its attempt count. The
  // default is a capped exponential with jitter (so a burst of jobs that failed
  // together do not all retry in lockstep). Tests inject a deterministic one.
  backoff?: (attempt: number, now: Date) => Date;
  // How many times a transient failure is retried before the job is marked a
  // terminal failure needing attention. Bounds retries so a persistently-failing
  // job cannot loop forever.
  maxAttempts?: number;
  // Injectable [0,1) source so a test can pin the backoff jitter; defaults to
  // Math.random.
  random?: () => number;
  now?: () => Date;
}

const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_MAX_ATTEMPTS = 20;
const BACKOFF_BASE_MS = 10_000;
const BACKOFF_CAP_MS = 10 * 60_000;
const BACKOFF_JITTER_RATIO = 0.2;

// Capped exponential backoff with jitter. attempt is >= 1 (claimDueJob increments
// it on every claim), so the first retry waits ~BACKOFF_BASE_MS. The jitter
// (delay * (1 ± ratio)) spreads jobs that failed together — e.g. a whole
// provider outage — so they do not retry in a synchronized thundering herd.
function jitteredBackoff(
  attempt: number,
  now: Date,
  random: () => number,
): Date {
  const exp = Math.min(attempt - 1, 6);
  const base = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** exp);
  const swing = BACKOFF_JITTER_RATIO * (random() * 2 - 1);
  const delay = Math.max(0, Math.round(base * (1 + swing)));
  return new Date(now.getTime() + delay);
}

// Drains the job queue: claim a due job, run it through dispatch, and settle it
// (delete on success, reschedule on transient failure, mark failed once retries
// are exhausted or the failure is permanent). One worker owns a lease; several
// can run concurrently and never both win the same job (claimDueJob is atomic).
// The lease heartbeat for a job outliving its lease is a later slice; this is the
// claim -> dispatch -> settle core the scheduler drives.
export class SyncJobWorker {
  readonly #deps: SyncJobWorkerDeps;
  readonly #owner: string;
  readonly #leaseMs: number;
  readonly #maxAttempts: number;
  readonly #backoff: (attempt: number, now: Date) => Date;
  readonly #now: () => Date;

  constructor(
    deps: SyncJobWorkerDeps,
    owner: string,
    options: SyncJobWorkerOptions = {},
  ) {
    this.#deps = deps;
    this.#owner = owner;
    this.#leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    this.#maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const random = options.random ?? Math.random;
    this.#backoff =
      options.backoff ??
      ((attempt, now) => jitteredBackoff(attempt, now, random));
    this.#now = options.now ?? (() => new Date());
  }

  // Claim and process at most one due job. Returns "idle" when nothing is due.
  async runOnce(): Promise<"idle" | "processed"> {
    const job = await this.#deps.jobs.claimDueJob(
      this.#owner,
      this.#now(),
      this.#leaseMs,
    );
    if (!job) return "idle";
    await this.#process(job);
    return "processed";
  }

  // Drain due jobs up to a bound (a safety valve against a self-refilling queue
  // starving the caller). Returns how many were processed.
  async drain(max = 100): Promise<number> {
    let processed = 0;
    while (processed < max) {
      const outcome = await this.runOnce();
      if (outcome === "idle") break;
      processed += 1;
    }
    return processed;
  }

  async #process(job: JobRecord): Promise<void> {
    let outcome: Awaited<ReturnType<typeof dispatchSyncJob>>;
    try {
      outcome = await dispatchSyncJob(this.#deps, job, this.#now);
    } catch {
      // An engine threw (a transient provider/storage error dispatch does not
      // model as a status). Treat it as retryable; the cap still bounds it.
      await this.#settleFailure(job, "retryableTransient");
      return;
    }

    switch (outcome.result) {
      case "done":
        // Enqueue the followup (if any) BEFORE completing this job: the enqueue
        // is idempotent (coalesced), so a crash between the two re-runs this
        // idempotent job and re-enqueues the same followup, whereas completing
        // first then crashing would drop the followup.
        if (outcome.followup) await this.#deps.jobs.enqueue(outcome.followup);
        await this.#deps.jobs.complete(job._id, this.#owner);
        return;
      case "drop":
        // Nothing to do (target vanished); settle so it never retries.
        await this.#deps.jobs.complete(job._id, this.#owner);
        return;
      case "retry":
        await this.#settleFailure(job, outcome.failureClass);
        return;
      case "unsupported":
        // No handler for this kind in this build (commandApply/reconcile arrive
        // later). Hold it via a backed-off retry rather than hot-loop or drop
        // unfinished work; the cap eventually fails a job that no build claims.
        // No producer enqueues these kinds yet, so this is defensive.
        await this.#settleFailure(job, "retryableTransient");
        return;
    }
  }

  // Reschedule a failed job for a backed-off retry, OR mark it a terminal failure
  // once retries are exhausted or the failure is permanent. A failed job keeps
  // its coalescing key, so enqueue will not create a replacement until an
  // operator clears it — deliberate backpressure: a persistently-broken resource
  // stops and asks for attention rather than looping (or resurrecting on every
  // sweep, which would be unlimited retries by another name).
  async #settleFailure(
    job: JobRecord,
    failureClass: JobRecord["failureClass"],
  ): Promise<void> {
    const exhausted = job.attempt >= this.#maxAttempts;
    if (failureClass === "permanent" || exhausted) {
      await this.#deps.jobs.fail(job._id, this.#owner, failureClass);
      return;
    }
    await this.#deps.jobs.scheduleRetry(
      job._id,
      this.#owner,
      this.#backoff(job.attempt, this.#now()),
      failureClass,
    );
  }
}
