import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME) === "true";
  } catch {
    return true;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
