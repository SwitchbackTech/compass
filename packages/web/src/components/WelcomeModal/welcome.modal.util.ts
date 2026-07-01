import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export function hasSeenWelcome(): boolean {
  if (!persistentBrowserStore.isAvailable()) return true;
  return persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_WELCOME) === "true";
}

export function markWelcomeSeen(): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
}
