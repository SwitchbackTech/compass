import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export function hasSeenOnboardingTour(): boolean {
  if (!persistentBrowserStore.isAvailable()) return true;
  return (
    persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR) === "true"
  );
}

export function markOnboardingTourSeen(): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR, "true");
}

/** Set when a welcome-modal exit hands off to signup instead of starting the tour. */
export function markTourOfferPending(): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_PENDING_TOUR_OFFER, "true");
}

/** Consumed once, right after signup completes, to decide whether to offer the tour. */
export function consumePendingTourOffer(): boolean {
  if (!persistentBrowserStore.isAvailable()) return false;
  const pending =
    persistentBrowserStore.get(STORAGE_KEYS.HAS_PENDING_TOUR_OFFER) === "true";
  if (pending) {
    persistentBrowserStore.remove(STORAGE_KEYS.HAS_PENDING_TOUR_OFFER);
  }
  return pending;
}
