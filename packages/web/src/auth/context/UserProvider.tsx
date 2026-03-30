import { type ReactNode } from "react";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useLoadProfile } from "@web/auth/hooks/user/useLoadProfile";
import { useIdentifyUser } from "@web/auth/posthog/useIdentifyUser";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { UserContext } from "./UserContext";

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { authenticated } = useSession();
  const hasAuthenticatedBefore = authenticated || hasUserEverAuthenticated();
  const { email, profile, profileEmail, userId } = useLoadProfile(
    hasAuthenticatedBefore,
  );
  useIdentifyUser(profileEmail, userId);

  return (
    <UserContext.Provider
      value={{
        ...(profile ?? {}),
        email: email ?? undefined,
        userId: userId ?? undefined,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
