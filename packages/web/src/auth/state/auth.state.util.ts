import {
  type AuthState,
  AuthStateSchema,
  DEFAULT_AUTH_STATE,
} from "@web/common/constants/auth.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { clearGoogleRevokedState } from "../google/state/google.auth.state";

const authStateListeners = new Set<() => void>();

function emitAuthStateChange(): void {
  authStateListeners.forEach((listener) => listener());
}

function normalizeStoredAuthState(parsed: unknown): AuthState {
  if (typeof parsed !== "object" || parsed === null) {
    return DEFAULT_AUTH_STATE;
  }

  const legacyState = parsed as {
    isGoogleAuthenticated?: unknown;
    hasAuthenticated?: unknown;
    lastKnownEmail?: unknown;
    shouldPromptSignUpAfterAnonymousCalendarChange?: unknown;
  };

  // Migrate legacy isGoogleAuthenticated to hasAuthenticated
  const hasAuthenticated =
    typeof legacyState.hasAuthenticated === "boolean"
      ? legacyState.hasAuthenticated
      : typeof legacyState.isGoogleAuthenticated === "boolean"
        ? legacyState.isGoogleAuthenticated
        : false;

  const migratedState = {
    hasAuthenticated,
    lastKnownEmail: legacyState.lastKnownEmail,
    shouldPromptSignUpAfterAnonymousCalendarChange:
      legacyState.shouldPromptSignUpAfterAnonymousCalendarChange,
  };

  const result = AuthStateSchema.safeParse(migratedState);
  return result.success ? result.data : DEFAULT_AUTH_STATE;
}

/**
 * Get the current authentication state from localStorage.
 * Returns default state if not found or invalid.
 */
export function getAuthState(): AuthState {
  if (typeof window === "undefined") return DEFAULT_AUTH_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      return normalizeStoredAuthState(parsed);
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
      emitAuthStateChange();
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Marks that the user has authenticated at least once.
 * Once set, the app will always use RemoteEventRepository instead of LocalEventRepository.
 * This prevents the UX issue where events disappear after login due to cleared IndexedDB.
 * Also clears any revoked state since user is re-authenticating.
 */
export function markUserAsAuthenticated(lastKnownEmail?: string): void {
  if (typeof window === "undefined") return;

  try {
    updateAuthState({
      hasAuthenticated: true,
      ...(lastKnownEmail ? { lastKnownEmail } : {}),
    });
    clearGoogleRevokedState();
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
    return getAuthState().hasAuthenticated;
  } catch {
    return false;
  }
}

export function getLastKnownEmail(): string | undefined {
  try {
    return getAuthState().lastKnownEmail;
  } catch {
    return undefined;
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
    emitAuthStateChange();
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearAnonymousCalendarChangeSignUpPrompt(): void {
  updateAuthState({ shouldPromptSignUpAfterAnonymousCalendarChange: false });
}

export function markAnonymousCalendarChangeForSignUpPrompt(): void {
  updateAuthState({ shouldPromptSignUpAfterAnonymousCalendarChange: true });
}

export function shouldShowAnonymousCalendarChangeSignUpPrompt(): boolean {
  try {
    return getAuthState().shouldPromptSignUpAfterAnonymousCalendarChange;
  } catch {
    return false;
  }
}

export function subscribeToAuthState(listener: () => void): () => void {
  authStateListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      authStateListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.AUTH) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    authStateListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}
