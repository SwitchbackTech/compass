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
  // When to retry a job that failed or asked to be retried, from its attempt
  // count. The default is a capped exponential with no jitter; fair scheduling
  // and jitter are S34's concern.
  backoff?: (attempt: number, now: Date) => Date;
  now?: () => Date;
}

const DEFAULT_LEASE_MS = 5 * 60_000;
const BACKOFF_BASE_MS = 10_000;
const BACKOFF_CAP_MS = 10 * 60_000;

// Capped exponential backoff. attempt is >= 1 (claimDueJob increments it on
// every claim), so the first retry waits BACKOFF_BASE_MS.
function defaultBackoff(attempt: number, now: Date): Date {
  const exp = Math.min(attempt - 1, 6);
  const delay = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** exp);
  return new Date(now.getTime() + delay);
}

// Drains the job queue: claim a due job, run it through dispatch, and settle it
// (delete on success, reschedule on retry). One worker owns a lease; several can
// run concurrently and never both win the same job (claimDueJob is atomic). The
// continuous poll timer, heartbeat, and lifecycle wiring are a later slice; this
// is the claim -> dispatch -> settle core they drive.
export class SyncJobWorker {
  readonly #deps: SyncJobWorkerDeps;
  readonly #owner: string;
  readonly #leaseMs: number;
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
    this.#backoff = options.backoff ?? defaultBackoff;
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
      // model as a status). Reschedule for a backed-off retry rather than lose
      // the job; S34 refines the retryable/permanent classification.
      await this.#deps.jobs.scheduleRetry(
        job._id,
        this.#owner,
        this.#backoff(job.attempt, this.#now()),
        "retryableTransient",
      );
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
        await this.#deps.jobs.scheduleRetry(
          job._id,
          this.#owner,
          this.#backoff(job.attempt, this.#now()),
          outcome.failureClass,
        );
        return;
      case "unsupported":
        // No handler for this kind in this build (commandApply/reconcile arrive
        // later). Hold it for a future build via a backed-off retry rather than
        // hot-loop or drop unfinished work. No producer enqueues these kinds
        // yet, so this is defensive.
        await this.#deps.jobs.scheduleRetry(
          job._id,
          this.#owner,
          this.#backoff(job.attempt, this.#now()),
          "retryableTransient",
        );
        return;
    }
  }
}
