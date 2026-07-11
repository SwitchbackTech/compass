import { useCallback } from "react";
import { session } from "@web/auth/compass/session/Session";
import { useSession } from "@web/auth/compass/session/useSession";
import { clearAuthenticationState } from "@web/auth/compass/state/auth.state.util";

export function useLogout() {
  const { setAuthenticated } = useSession();

  return useCallback(() => {
    void session.signOut().catch((error) => {
      console.warn("Failed to complete backend sign-out:", error);
    });

    clearAuthenticationState();
    setAuthenticated(false);
  }, [setAuthenticated]);
}
