import { getLastKnownEmail } from "@web/auth/state/auth.state.util";

/**
 * Feature flag hook for email/password authentication UI
 *
 * Checks for the URL parameter to conditionally
 * show the auth modal and related UI elements.
 *
 * @returns boolean - true if auth feature is enabled via URL param
 *
 * @example
 * // Use /day?auth=signup to implicitly enable and open modal
 * const isAuthEnabled = useAuthFeatureFlag();
 */
export function useAuthFeatureFlag(): boolean {
  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has("auth")) {
      return true;
    }
  }

  if (getLastKnownEmail() !== undefined) {
    return true;
  }

  return false;
}
