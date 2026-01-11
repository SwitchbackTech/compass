import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

/**
 * Utility for managing persistent authentication state.
 * Tracks whether a user has ever authenticated to determine repository selection.
 */

/**
 * Marks that the user has authenticated at least once.
 * Once set, the app will always use RemoteEventRepository instead of LocalEventRepository.
 * This prevents the UX issue where events disappear after login due to cleared IndexedDB.
 */
export function markUserAsAuthenticated(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HAS_AUTHENTICATED, "true");
    console.log("[Auth State] User marked as authenticated");
  } catch (error) {
    console.error("[Auth State] Failed to mark user as authenticated:", error);
  }
}

/**
 * Checks if the user has ever authenticated.
 * Returns true if the user has logged in at least once.
 *
 * @returns true if user has previously authenticated
 */
export function hasUserEverAuthenticated(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.HAS_AUTHENTICATED);
    return value === "true";
  } catch (error) {
    console.error("[Auth State] Failed to check authentication state:", error);
    return false;
  }
}

/**
 * Clears the authentication state.
 * WARNING: Only use this when user explicitly logs out and wants to clear all data.
 */
export function clearAuthenticationState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.HAS_AUTHENTICATED);
    console.log("[Auth State] Authentication state cleared");
  } catch (error) {
    console.error("[Auth State] Failed to clear authentication state:", error);
  }
}
