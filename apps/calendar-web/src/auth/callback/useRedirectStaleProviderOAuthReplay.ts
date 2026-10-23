import { useLocation, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { resolveStaleProviderOAuthReplay } from "@web/auth/callback/resolve-stale-provider-oauth-replay";

/**
 * Sends signed-in users off a replayed provider callback URL (back/forward or a
 * manual pushState) without running the one-shot exchange again.
 */
export function useRedirectStaleProviderOAuthReplay(
  provider: ProviderKind,
  enabled: boolean,
): void {
  const location = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void resolveStaleProviderOAuthReplay({
      provider,
      search: location.searchStr,
      pathname: location.pathname,
    }).then((returnPath) => {
      if (returnPath) {
        router.history.replace(returnPath);
      }
    });
  }, [enabled, location.pathname, location.searchStr, provider, router]);
}
