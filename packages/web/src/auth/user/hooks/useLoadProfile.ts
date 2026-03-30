import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Status } from "@core/errors/status.codes";
import { type UserProfile } from "@core/types/user.types";
import {
  getLastKnownEmail,
  markUserAsAuthenticated,
} from "@web/auth/state/auth.state.util";
import { UserApi } from "@web/common/apis/user.api";
import { showSessionExpiredToast } from "@web/common/utils/toast/error-toast.util";

export type UseLoadProfileResult = {
  email: string | null;
  profile: UserProfile | null;
  profileEmail: string | null;
  userId: string | null;
};

/**
 * Fetches the authenticated user profile when `hasAuthenticatedBefore` is true.
 * While loading, exposes the last known email from storage when available.
 */
export function useLoadProfile(
  hasAuthenticatedBefore: boolean,
): UseLoadProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(hasAuthenticatedBefore);
  const profileRequest = useRef<Promise<void> | null>(null);
  const userId = profile?.userId ?? null;
  const profileEmail = profile?.email ?? null;
  const email =
    profileEmail ??
    (profile === null && isLoadingUser ? (getLastKnownEmail() ?? null) : null);

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

    if (!hasAuthenticatedBefore) {
      setIsLoadingUser(false);
      return;
    }

    void loadProfile();
  }, [hasAuthenticatedBefore, loadProfile, profile]);

  return {
    email,
    profile,
    profileEmail,
    userId,
  };
}
