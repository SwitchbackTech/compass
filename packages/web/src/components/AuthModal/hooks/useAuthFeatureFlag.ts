import { useSearchParams } from "react-router-dom";

/**
 * Feature flag hook for email/password authentication UI
 *
 * Checks for the URL parameter `?enableAuth=true` to conditionally
 * show the auth modal and related UI elements.
 *
 * @returns boolean - true if auth feature is enabled via URL param
 *
 * @example
 * // Navigate to /day?enableAuth=true to enable
 * const isAuthEnabled = useAuthFeatureFlag();
 */
export function useAuthFeatureFlag(): boolean {
  const [searchParams] = useSearchParams();
  return searchParams.get("enableAuth") === "true";
}
