import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export type PostOnboardingStage = "connect" | "trial" | "done";

/** Null means the flow has never been triggered for this browser. */
export function getPostOnboardingStage(): PostOnboardingStage | null {
  const value = persistentBrowserStore.get(STORAGE_KEYS.POST_TOUR_STAGE);
  if (value === "connect" || value === "trial" || value === "done") {
    return value;
  }
  return null;
}

export function setPostOnboardingStage(stage: PostOnboardingStage): void {
  persistentBrowserStore.set(STORAGE_KEYS.POST_TOUR_STAGE, stage);
}
