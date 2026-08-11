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

export function isTrialExpired(): boolean {
  return getTrialDaysLeft() <= 0;
}
