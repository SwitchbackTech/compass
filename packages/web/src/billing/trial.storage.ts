import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

/** Matches the server trial length (billing.constants.ts TRIAL_LENGTH_DAYS). */
export const TRIAL_LENGTH_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Anonymous-only, client-side trial clock: no server identity exists yet to
 * track it against. Deliberately unsophisticated — clearing storage renews
 * the trial, and that's an accepted tradeoff, not a bug to fix.
 */
/**
 * One-time cleanup of the pre-`.v2` trial stamp.
 *
 * Production briefly served `billing.enforcement: true` around 2026-08-12..14,
 * which stamped `compass.trial.started-at` in ~19 visitors' browsers before the
 * switch went back off. Those stamps are now months stale, so the next time
 * enforcement is enabled anywhere those visitors would be gated instantly
 * rather than getting the trial they never actually consumed — and
 * `useAppAccess` reaches the anonymous-trial branch before it checks whether
 * Stripe is configured, so an unconfigured deployment would gate them with no
 * way to pay.
 *
 * Versioning the key retires every stamp written under the old name. Callers
 * must invoke this regardless of the enforcement switch: on a paused
 * deployment `useTrialStatus` returns before it would otherwise touch storage,
 * which is exactly the case that needs clearing.
 */
export function purgeLegacyTrialStamp(): void {
  if (!persistentBrowserStore.isAvailable()) return;
  persistentBrowserStore.remove(STORAGE_KEYS.TRIAL_STARTED_AT_LEGACY);
}

/** Returns true the one time it actually stamps the start (a fresh trial). */
export function ensureTrialStarted(): boolean {
  if (!persistentBrowserStore.isAvailable()) return false;
  if (persistentBrowserStore.get(STORAGE_KEYS.TRIAL_STARTED_AT)) return false;
  persistentBrowserStore.set(
    STORAGE_KEYS.TRIAL_STARTED_AT,
    new Date().toISOString(),
  );
  return true;
}

/** Days remaining, floored at 0. Treats missing/unreadable state as a full trial. */
export function getTrialDaysLeft(): number {
  if (!persistentBrowserStore.isAvailable()) return TRIAL_LENGTH_DAYS;
  const startedAt = persistentBrowserStore.get(STORAGE_KEYS.TRIAL_STARTED_AT);
  if (!startedAt) return TRIAL_LENGTH_DAYS;

  const startedMs = Date.parse(startedAt);
  if (Number.isNaN(startedMs)) return TRIAL_LENGTH_DAYS;

  const elapsedDays = Math.floor((Date.now() - startedMs) / MS_PER_DAY);
  return Math.max(0, TRIAL_LENGTH_DAYS - elapsedDays);
}
