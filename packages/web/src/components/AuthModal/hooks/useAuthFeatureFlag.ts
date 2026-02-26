import { useSearchParams } from "react-router-dom";

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
  const [searchParams] = useSearchParams();
  return searchParams.has("auth");
}
