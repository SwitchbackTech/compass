import { useEffect } from "react";
import { usePostHog } from "@web/auth/posthog/posthog-react";

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
      posthog.identify(userId, { email: profileEmail, user_id: userId });
    }
  }, [profileEmail, posthog, userId]);
}
