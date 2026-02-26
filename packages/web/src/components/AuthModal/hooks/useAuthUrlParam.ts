import { useEffect, useRef } from "react";
import { AuthView } from "./useAuthModal";

/**
 * Maps URL parameter values to AuthView types
 * Supports common URL-friendly names for each auth view
 */
const VIEW_MAP: Record<string, AuthView> = {
  login: "login",
  signup: "signUp",
  forgot: "forgotPassword",
};

/**
 * Hook that opens the auth modal based on URL parameters
 *
 * Reads the `?auth=` parameter and opens the modal to the corresponding view.
 * After opening, the parameter is removed from the URL to prevent re-triggering
 * on page refresh.
 *
 * @param openModal - Function to open the modal with a specific view
 *
 * @example
 * // URL: /?auth=signup → Opens signup modal, URL becomes /
 * // URL: /week?auth=login → Opens login modal, URL becomes /week
 * // URL: /?auth=forgot → Opens forgot password modal
 *
 * Supported parameter values:
 * - "login" → signIn view
 * - "signup" → signUp view
 * - "forgot" → forgotPassword view
 */
export function useAuthUrlParam(openModal: (view?: AuthView) => void): void {
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent double-trigger in React StrictMode
    if (hasProcessedRef.current) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const authParam = searchParams.get("auth");

    if (!authParam) {
      return;
    }

    // Case-insensitive lookup
    const normalizedParam = authParam.toLowerCase();
    const view = VIEW_MAP[normalizedParam];

    if (view) {
      hasProcessedRef.current = true;
      openModal(view);

      // Remove the auth param from URL without adding history entry
      searchParams.delete("auth");
      const newSearch = searchParams.toString();
      const newUrl =
        window.location.pathname +
        (newSearch ? `?${newSearch}` : "") +
        window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, [openModal]);
}
