import {
  type ExhaustedFailedJob,
  type JobRepository,
} from "@sync/storage/repositories/job.repository";

// How many times the self-heal sweep will requeue the same job before leaving
// it failed for an operator instead. Shared with diagnostics so exhausted
// counts use the same budget the sweep enforces.
export const FAILED_JOB_MAX_REQUEUES = 3;

export interface FailedJobRequeueDeps {
  jobs: JobRepository;
}

export interface FailedJobRequeueResult {
  // How many failed jobs this sweep gave a fresh retry ladder.
  requeued: number;
  // How many failed jobs have hit the requeue cap and re-failed anyway — the
  // sweep will not touch them again; they need an operator.
  exhausted: number;
  // Bounded sample of exhausted rows for operator-facing logs / CLI.
  exhaustedJobs: ExhaustedFailedJob[];
}

// The self-heal sweep for jobs terminalized as state:"failed". A worker marks
// a job failed once it exhausts its per-attempt retry ladder (see
// sync-job-worker.service.ts); nothing else ever requeues it. When the
// underlying condition was transient (a provider blip, a network partition
// that outlasted the ladder), that job is stuck forever with no further
// signal — a staging calendar sat wedged ~25h this way with every other
// health signal green (2026-07-30).
//
// Requeuing resets the job to pending with a fresh attempt count (so it gets
// the FULL retry ladder again, not one more attempt), but requeuedCount
// itself is never reset — that is the bound on how many times this sweep will
// keep giving a persistently-broken resource another chance before it counts
// as needing operator attention instead.
//
// A GLOBAL scan across owners (this is system liveness, not a user request);
// each requeued job keeps its own owner ids and coalescing key. The periodic
// trigger that drives this on an interval is the same SweepScheduler every
// other sweep uses.
export async function requeueFailedJobs(
  deps: FailedJobRequeueDeps,
  before: Date,
  now: () => Date,
  maxRequeues: number = FAILED_JOB_MAX_REQUEUES,
  limit = 100,
): Promise<FailedJobRequeueResult> {
  const candidates = await deps.jobs.listFailedForRequeue(
    before,
    maxRequeues,
    limit,
  );
  for (const job of candidates) {
    await deps.jobs.requeue(job._id, now());
  }
  const [exhausted, exhaustedJobs] = await Promise.all([
    deps.jobs.countExhaustedFailed(maxRequeues),
    deps.jobs.listExhaustedFailed(maxRequeues),
  ]);
  return {
    requeued: candidates.length,
    exhausted,
    exhaustedJobs,
  };
}
