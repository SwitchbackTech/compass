import { usePostHog } from "posthog-js/react";
import {
  ReactNode,
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { UserProfile } from "@core/types/user.types";
import { UserApi } from "@web/common/apis/user.api";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

const UserContext = createContext<
  | Partial<
      { isLoadingUser: boolean; userId: string } & Omit<UserProfile, "_id">
    >
  | undefined
>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const profile = useRef<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const posthog = usePostHog();
  const userId = profile.current?.userId ?? null;
  const email = profile.current?.email ?? null;

  useLayoutEffect(() => {
    if (profile.current) return;

    setIsLoadingUser(true);

    UserApi.getProfile()
      .then((userProfile) => {
        profile.current = userProfile;
      })
      .catch((e) => {
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

  if (isLoadingUser || userId === null) {
    return <AbsoluteOverflowLoader />;
  }

  return (
    <UserContext.Provider
      value={{ ...(profile.current ?? {}), userId, isLoadingUser }}
    >
      {children}
    </UserContext.Provider>
  );
};
