import {
  type ExhaustedFailedJob,
  type JobRepository,
} from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

// How many times the self-heal sweep will requeue the same job before leaving
// it failed for an operator instead. Shared with diagnostics so exhausted
// counts use the same budget the sweep enforces.
export const FAILED_JOB_MAX_REQUEUES = 3;

export interface FailedJobRequeueDeps {
  jobs: JobRepository;
  // Used to detect exhausted jobs that are only stuck because a durable
  // provider refusal already stamped lastReadFailureAt on the connection —
  // retrying cannot help, and the failed row's coalescing key blocks
  // rediscovery / reconnect enqueue until it is cleared.
  resources: Pick<SyncResourceRepository, "listByConnection">;
}

export interface FailedJobRequeueResult {
  // How many failed jobs this sweep gave a fresh retry ladder.
  requeued: number;
  // How many failed jobs remain exhausted after durable auto-clears — the
  // sweep will not touch them again; they need an operator.
  exhausted: number;
  // Bounded sample of remaining exhausted rows for operator-facing logs / CLI.
  exhaustedJobs: ExhaustedFailedJob[];
  // Exhausted jobs cleared because the connection already carries a durable
  // provider read-failure marker (see clearExhaustedBlockedByDurableFailure).
  clearedDurable: number;
  clearedJobs: ExhaustedFailedJob[];
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
  const clearedJobs = await clearExhaustedBlockedByDurableFailure(
    deps,
    maxRequeues,
    limit,
  );
  const [exhausted, exhaustedJobs] = await Promise.all([
    deps.jobs.countExhaustedFailed(maxRequeues),
    deps.jobs.listExhaustedFailed(maxRequeues),
  ]);
  return {
    requeued: candidates.length,
    exhausted,
    exhaustedJobs,
    clearedDurable: clearedJobs.length,
    clearedJobs,
  };
}

// Prod 2026-08-09: calendarListSync for a notACalendarUser connection burned
// the retry ladder (and self-heal budget) before durable discoveryFailed drops
// shipped, then sat exhausted while events resources on the same connection
// already carried lastReadFailureAt from incrementalPull drops. The self-heal
// sweep re-logged that single row as a PostHog error every ~10 minutes, and
// the failed coalescing key blocked rediscovery from enqueuing a fresh
// calendarListSync that would now drop cleanly.
//
// When an exhausted job's connection already has a durable read-failure
// marker, clear the job (same as manage-failed-jobs clear) instead of paging
// forever. Health already surfaces providerErrors from the marker; keeping the
// failed row only adds noise and blocks the next enqueue.
async function clearExhaustedBlockedByDurableFailure(
  deps: FailedJobRequeueDeps,
  maxRequeues: number,
  limit: number,
): Promise<ExhaustedFailedJob[]> {
  const exhaustedJobs = await deps.jobs.listExhaustedFailed(maxRequeues, limit);
  const cleared: ExhaustedFailedJob[] = [];
  for (const job of exhaustedJobs) {
    const resources = await deps.resources.listByConnection(
      job.tenantId,
      job.principalId,
      job.connectionId,
    );
    if (!resources.some((resource) => resource.lastReadFailureAt != null)) {
      continue;
    }
    const removed = await deps.jobs.remove(job.id, job.coalescingKey);
    if (removed) cleared.push(job);
  }
  return cleared;
}
