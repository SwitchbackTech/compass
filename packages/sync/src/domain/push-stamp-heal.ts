import { enqueueForResources } from "@sync/domain/resource-sweep-enqueue";
import { resourceJob } from "@sync/storage/contracts/job.contracts";
import { type JobRepository } from "@sync/storage/repositories/job.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

// Re-watch at most this many unstamped Google channels per heal sweep tick.
// Paired with the cooldown in subscription-maintenance.service so a fleet of
// legacy channels cannot churn while the initial `sync` callback is in flight.
export const PUSH_STAMP_HEAL_SWEEP_LIMIT = 10;

export interface PushStampHealDeps {
  jobs: JobRepository;
  resources: SyncResourceRepository;
  // Called once per resource that could not be enqueued; the sweep keeps going.
  onEnqueueError?: (error: unknown, resourceId: string) => void;
}

/**
 * Self-heal sweep for live Google channels that predate pushLastReceivedAt
 * stamping on the initial `sync` handshake (#4442). Enqueues a
 * subscriptionMaintain so Google sends a fresh handshake and the notification
 * route can stamp receipt, instead of waiting up to ~24h for natural renewal.
 *
 * Looks BACK, like reconcile: `healAttemptedBefore` is the cooldown cutoff, so
 * only rows with no prior heal attempt, or one older than the window, are
 * eligible. `now` defines "live" (subscriptionExpiresAt >= now).
 */
export function enqueuePushStampHeal(
  deps: PushStampHealDeps,
  healAttemptedBefore: Date,
  now: () => Date,
  limit = PUSH_STAMP_HEAL_SWEEP_LIMIT,
): Promise<number> {
  const at = now();
  return enqueueForResources(
    deps,
    (before, batchLimit) =>
      deps.resources.listLiveSubscriptionsMissingPushReceipt(
        at,
        before,
        batchLimit,
        { provider: "google" },
      ),
    (resource, nowFn) => resourceJob(resource, "subscriptionMaintain", nowFn()),
    healAttemptedBefore,
    now,
    limit,
  );
}
