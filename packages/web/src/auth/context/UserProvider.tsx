import { usePostHog } from "posthog-js/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Status } from "@core/errors/status.codes";
import { type UserProfile } from "@core/types/user.types";
import { useSession } from "@web/auth/hooks/session/useSession";
import {
  hasUserEverAuthenticated,
  markUserAsAuthenticated,
} from "@web/auth/state/auth.state.util";
import { UserApi } from "@web/common/apis/user.api";
import { showSessionExpiredToast } from "@web/common/utils/toast/error-toast.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { UserContext } from "./UserContext";

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { authenticated } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const profileRequest = useRef<Promise<void> | null>(null);
  const posthog = usePostHog();
  const userId = profile?.userId ?? null;
  const email = profile?.email ?? null;

  const loadProfile = useCallback(() => {
    if (profileRequest.current) {
      return profileRequest.current;
    }

    setIsLoadingUser(true);

    profileRequest.current = UserApi.getProfile()
      .then((userProfile) => {
        setProfile(userProfile);
        markUserAsAuthenticated(userProfile.email);
      })
      .catch((e) => {
        // Existing authenticated users can hit this when their session expires.
        const status = (e as { response?: { status?: number } })?.response
          ?.status;
        const isUnauthorized =
          status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

        if (isUnauthorized) {
          showSessionExpiredToast();
          return;
        }

        console.error("Failed to get user profile", e);
      })
      .finally(() => {
        profileRequest.current = null;
        setIsLoadingUser(false);
      });

    return profileRequest.current;
  }, []);

  useLayoutEffect(() => {
    if (profile) return;

    const shouldLoadProfile = authenticated || hasUserEverAuthenticated();
    if (!shouldLoadProfile) {
      return;
    }

    void loadProfile();
  }, [authenticated, loadProfile, profile]);

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
        ...(profile ?? {}),
        userId: userId ?? undefined,
        isLoadingUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
