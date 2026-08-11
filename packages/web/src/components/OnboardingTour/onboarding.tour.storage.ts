import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  ONBOARDING_TOUR_STEP_IDS,
  type OnboardingTourStepId,
} from "@web/components/OnboardingTour/onboarding.tour.steps";

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

/** Saved on every step change while the tour is active, so an abandoned tab
 * can resume instead of losing position. Cleared on finish or skip. */
export function saveTourProgress(stepId: OnboardingTourStepId): void {
  persistentBrowserStore.set(STORAGE_KEYS.TOUR_PROGRESS, stepId);
}

export function clearTourProgress(): void {
  persistentBrowserStore.remove(STORAGE_KEYS.TOUR_PROGRESS);
}

/** Returns the saved step id, or null if there's no resumable progress. */
export function loadTourProgress(): OnboardingTourStepId | null {
  if (!persistentBrowserStore.isAvailable()) return null;
  const value = persistentBrowserStore.get(STORAGE_KEYS.TOUR_PROGRESS);
  if (!value) return null;
  return ONBOARDING_TOUR_STEP_IDS.includes(value as OnboardingTourStepId)
    ? (value as OnboardingTourStepId)
    : null;
}
