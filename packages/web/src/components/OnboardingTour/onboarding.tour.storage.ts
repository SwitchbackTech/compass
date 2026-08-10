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
