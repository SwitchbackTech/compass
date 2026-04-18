import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

/**
 * Identifies the user in PostHog when `userId` and profile email are available.
 */
export function useIdentifyUser(
  profileEmail: string | null,
  userId: string | null,
): void {
  const posthog = usePostHog();
  useEffect(() => {
    if (
      userId &&
      profileEmail &&
      posthog &&
      typeof posthog.identify === "function"
    ) {
      posthog.identify(profileEmail, { email: profileEmail, userId });
    }
  }, [profileEmail, posthog, userId]);
}
