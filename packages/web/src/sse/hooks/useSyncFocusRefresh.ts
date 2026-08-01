import { useCallback, useEffect, useRef } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type UseConnectGoogleResult } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { useVisibleAfterHidden } from "@web/common/hooks/useVisibleAfterHidden";

// A tab hidden for less than this is treated as a quick alt-tab, not a
// meaningful gap in attention — mirrors useVersionCheck's threshold.
const MIN_HIDDEN_DURATION_MS = 30_000;

/**
 * Triggers the same Google Calendar sync refresh as the sidebar's "Refresh
 * calendar" CTA (`useConnectGoogle().refresh`), automatically: on mount and
 * whenever the tab regains focus after being hidden for 30+ seconds. Without
 * this, a user only sees a caught-up calendar if they remember to click
 * Refresh themselves. Passes `silent: true` — the user didn't ask for this
 * one, so a transient failure shouldn't surface an error toast the way a
 * manual click's would. The sync service still coalesces redundant enqueues
 * regardless. Every `useConnectGoogle()` instance delegates to the same
 * browser-wide refresh coordinator, so a focus refresh and a manual click
 * share work and status instead of racing each other.
 *
 * No-ops while there's no established connection worth refreshing (not yet
 * connected, reconnect required, or still on the initial import).
 *
 * `useConnectGoogleImpl` is a test seam (default: the real hook) so tests can
 * pass a fake implementation instead of mock.module-ing a hook other files
 * also mock.
 */
export const useSyncFocusRefresh = (
  useConnectGoogleImpl: () => UseConnectGoogleResult = useConnectGoogle,
) => {
  const { isAvailable, refresh, state } = useConnectGoogleImpl();
  const didRefreshOnMount = useRef(false);
  const canRefresh =
    isAvailable && (state === "HEALTHY" || state === "ATTENTION");
  const silentRefresh = useCallback(() => refresh({ silent: true }), [refresh]);

  useEffect(() => {
    if (!canRefresh || didRefreshOnMount.current) return;
    // Metadata briefly changes the connection state while a refresh is
    // requested. A mount refresh must not run again when that state settles,
    // or every completion enqueues another pull forever.
    didRefreshOnMount.current = true;
    silentRefresh();
  }, [canRefresh, silentRefresh]);

  useVisibleAfterHidden(silentRefresh, MIN_HIDDEN_DURATION_MS, canRefresh);
};
