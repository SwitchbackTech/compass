import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

/**
 * Users who finished or skipped the retired guided tour wrote this key; treat
 * them as having seen the showcase so the takeover never ambushes an
 * established user. Deliberately outside the typed StorageKey union: the key
 * is dead except for this one read.
 */
const LEGACY_TOUR_SEEN_KEY =
  "compass.onboarding.has-seen-onboarding-tour" as (typeof STORAGE_KEYS)["HAS_SEEN_SHORTCUT_SHOWCASE"];

export function hasSeenShortcutShowcase(): boolean {
  // Fail closed: never auto-launch a takeover when storage is unavailable.
  if (!persistentBrowserStore.isAvailable()) return true;
  return (
    persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE) ===
      "true" || persistentBrowserStore.get(LEGACY_TOUR_SEEN_KEY) === "true"
  );
}

export function markShortcutShowcaseSeen(): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "true");
}

/** Set when a welcome-modal exit hands off to signup instead of practicing. */
export function markShowcaseOfferPending(): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER, "true");
}

/**
 * A signup that straddles the tour-to-showcase deploy wrote the retired
 * tour's pending key; honor it once so those users still get onboarded.
 */
const LEGACY_PENDING_OFFER_KEY =
  "compass.onboarding.has-pending-tour-offer" as (typeof STORAGE_KEYS)["HAS_PENDING_SHOWCASE_OFFER"];

/** Consumed once, right after signup completes, to offer the showcase then. */
export function consumePendingShowcaseOffer(): boolean {
  if (!persistentBrowserStore.isAvailable()) return false;
  const pending =
    persistentBrowserStore.get(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER) ===
      "true" || persistentBrowserStore.get(LEGACY_PENDING_OFFER_KEY) === "true";
  if (pending) {
    persistentBrowserStore.remove(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER);
    persistentBrowserStore.remove(LEGACY_PENDING_OFFER_KEY);
  }
  return pending;
}
