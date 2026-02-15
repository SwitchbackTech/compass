import { usePostHog } from "posthog-js/react";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Status } from "@core/errors/status.codes";
import { UserProfile } from "@core/types/user.types";
import { UserApi } from "@web/common/apis/user.api";
import { hasUserEverAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";
import { UserContext } from "./UserContext";

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const profile = useRef<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const posthog = usePostHog();
  const userId = profile.current?.userId ?? null;
  const email = profile.current?.email ?? null;

  useLayoutEffect(() => {
    if (profile.current) return;

    // Only fetch profile if user has authenticated with Google Calendar
    // Users in localStorage/IndexedDB mode don't have a profile
    if (!hasUserEverAuthenticated()) {
      return;
    }

    setIsLoadingUser(true);

    UserApi.getProfile()
      .then((userProfile) => {
        profile.current = userProfile;
      })
      .catch((e) => {
        // Existing authenticated users can hit this when their session expires.
        const status = (e as { response?: { status?: number } })?.response
          ?.status;
        const isUnauthorized =
          status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

        if (isUnauthorized) {
          toast.error(
            "Session expired. Please log in again to reconnect Google Calendar.",
            {
              ...toastDefaultOptions,
              toastId: "profile-session-expired",
            },
          );
          return;
        }

        console.error("Failed to get user profile", e);
      })
      .finally(() => {
        setIsLoadingUser(false);
      });
  }, []);

  // Identify user in PostHog when userId and email are available
  // Only runs if PostHog is enabled (POSTHOG_HOST and POSTHOG_KEY are set)
  useEffect(() => {
    if (userId && email && posthog && typeof posthog.identify === "function") {
      posthog.identify(email, { email, userId });
    }
  }, [userId, email, posthog]);

  // Allow unauthenticated users to proceed without blocking
  // Only show loader briefly while checking auth status
  // Unauthenticated users will have profile.current === null, which is fine
  if (isLoadingUser && userId === null) {
    // Brief loading state - but don't block indefinitely
    // The route loader handles auth redirects
    return <AbsoluteOverflowLoader />;
  }

  return (
    <UserContext.Provider
      value={{
        ...(profile.current ?? {}),
        userId: userId ?? undefined,
        isLoadingUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
