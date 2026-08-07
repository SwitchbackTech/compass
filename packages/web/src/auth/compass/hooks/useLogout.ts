import { useCallback } from "react";
import { session } from "@web/auth/compass/session/Session";
import { useSession } from "@web/auth/compass/session/useSession";
import { clearAuthenticationState } from "@web/auth/compass/state/auth.state.util";
import { clearAccountScopedClientState } from "@web/auth/compass/session/logout.teardown";

const SIGN_OUT_TIMEOUT_MS = 4000;

export function useLogout() {
  const { setAuthenticated } = useSession();

  return useCallback(
    async (): Promise<{ signedOutRemotely: boolean }> => {
      // Clear auth state first, before awaiting signOut. The SIGN_OUT event
      // fires during signOut() and handleSessionMissing reads hasUserEverAuthenticated(),
      // which requires auth state to already be cleared to compute the correct source.
      clearAuthenticationState();

      let signedOutRemotely = false;
      try {
        await Promise.race([
          session.signOut(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Sign-out timeout")),
              SIGN_OUT_TIMEOUT_MS,
            ),
          ),
        ]);
        signedOutRemotely = true;
      } catch (error) {
        console.warn("Failed to complete backend sign-out:", error);
      }

      // Tear down account-scoped state regardless of backend outcome. If signOut
      // failed, handleSessionMissing never ran, so this is the only place that
      // tears down the SSE stream, metadata, and source.
      clearAccountScopedClientState();

      // Signal the UI that local logout is complete.
      setAuthenticated(false);

      return { signedOutRemotely };
    },
    [setAuthenticated],
  );
}
