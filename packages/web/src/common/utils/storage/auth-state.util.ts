import {
  AuthState,
  AuthStateSchema,
  DEFAULT_AUTH_STATE,
} from "@web/common/constants/auth.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

/**
 * Utility for managing persistent authentication state.
 * Tracks whether a user has ever authenticated to determine repository selection.
 */

/**
 * Get the current authentication state from localStorage.
 * Returns default state if not found or invalid.
 */
export function getAuthState(): AuthState {
  if (typeof window === "undefined") return DEFAULT_AUTH_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (stored) {
      const parsed = JSON.parse(stored);
      const result = AuthStateSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    }

    return DEFAULT_AUTH_STATE;
  } catch {
    return DEFAULT_AUTH_STATE;
  }
}

/**
 * Update authentication state in localStorage.
 * Merges partial updates into existing state.
 */
export function updateAuthState(updates: Partial<AuthState>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getAuthState();
    const updated: AuthState = {
      ...current,
      ...updates,
    };

    // Validate with zod schema
    const result = AuthStateSchema.safeParse(updated);
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(result.data));
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Marks that the user has authenticated at least once.
 * Once set, the app will always use RemoteEventRepository instead of LocalEventRepository.
 * This prevents the UX issue where events disappear after login due to cleared IndexedDB.
 */
export function markUserAsAuthenticated(): void {
  if (typeof window === "undefined") return;

  try {
    updateAuthState({ isGoogleAuthenticated: true });
    console.log("[Auth State] User marked as authenticated");
  } catch {
    // Silently fail if localStorage is unavailable
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
    return getAuthState().isGoogleAuthenticated;
  } catch {
    return false;
  }
}

/**
 * Clears the authentication state.
 * WARNING: Only use this when user explicitly logs out and wants to clear all data.
 */
export function clearAuthenticationState(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    console.log("[Auth State] Authentication state cleared");
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
