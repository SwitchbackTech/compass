// Alert threshold from 04-security: no sync_health_snapshot for > 10 minutes.
export const HEALTH_SNAPSHOT_STALE_AFTER_MS = 10 * 60_000;

// Pure predicate for the missing-heartbeat alert simulation (S44 evidence).
export function isHealthHeartbeatMissing(
  lastEmittedAt: Date | null,
  now: Date,
): boolean {
  if (lastEmittedAt === null) return true;
  return (
    now.getTime() - lastEmittedAt.getTime() > HEALTH_SNAPSHOT_STALE_AFTER_MS
  );
}
