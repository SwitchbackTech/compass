import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { AuthApi } from "@web/api/auth.api";
import {
  noteGoogleSyncRefreshImproved,
  refreshGoogleSync,
  useGoogleSyncRefreshSnapshot,
} from "@web/auth/google/state/google.sync.refresh";
import {
  selectPrimaryGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import {
  GOOGLE_CONNECT_FAILED_TOAST_ID,
  GOOGLE_REFRESH_ALREADY_IN_FLIGHT_TOAST_ID,
  GOOGLE_REFRESH_FAILED_TOAST_ID,
} from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { settingsActions } from "@web/settings/settings.store";
import { useIsConnectGoogleAvailable } from "../useIsGoogleAvailable/useIsGoogleAvailable";
import { type UseConnectGoogleResult } from "./useConnectGoogle.types";
import { getGoogleConnectionConfig } from "./useConnectGoogle.util";
import { useGoogleUiState } from "./useGoogleUiState";

export interface UseConnectGoogleOptions {
  /**
   * Scope the hook to one connected account: its own state drives the action
   * and status, and reconnect rebinds consent to that connection rather than
   * the precedence-winning one. Omit for the aggregate (whole-user) view.
   */
  connection?: GoogleSyncConnectionSummary | null;
}

export const useConnectGoogle = (
  options?: UseConnectGoogleOptions,
): UseConnectGoogleResult => {
  const isAvailable = useIsConnectGoogleAvailable();
  const aggregateState = useGoogleUiState();
  const primaryConnection = useUserMetadataStore(
    selectPrimaryGoogleSyncConnection,
  );
  const scopedConnection = options?.connection;
  const syncConnection = scopedConnection ?? primaryConnection;
  const state = scopedConnection?.connectionState ?? aggregateState;
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  // Sync guard so rapid re-clicks before React re-renders cannot start a
  // second OAuth attempt; isConnecting alone would still be false in-handler.
  const isConnectingRef = useRef(false);
  const refreshSnapshot = useGoogleSyncRefreshSnapshot();
  const isRefreshing = refreshSnapshot.isRefreshing;
  const stopConnecting = useCallback(() => {
    isConnectingRef.current = false;
    setIsConnecting(false);
  }, []);

  // OAuth uses a full navigation. If the user backs out and the page is
  // restored from bfcache, React state is frozen mid-connecting and would
  // otherwise leave the sidebar button disabled forever.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        stopConnecting();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [stopConnecting]);

  // Clear the Refresh catch-up wait once Sync leaves the delayed band that
  // showed the CTA (SSE syncStatusChanged already refetches metadata).
  useEffect(() => {
    if (!refreshSnapshot.refreshRequestedAt && !refreshSnapshot.gaveUp) {
      return;
    }
    const connectionState = syncConnection?.state;
    if (
      connectionState &&
      connectionState !== "delayed" &&
      state !== "ATTENTION"
    ) {
      noteGoogleSyncRefreshImproved();
    }
  }, [
    refreshSnapshot.gaveUp,
    refreshSnapshot.refreshRequestedAt,
    state,
    syncConnection?.state,
  ]);

  const onOpenGoogleAuth = useCallback(() => {
    if (isConnectingRef.current) {
      return;
    }

    // Show loading on the sidebar/command action immediately —
    // beginGoogleConnection runs before the OAuth redirect. Any local events
    // still in IndexedDB stay there across the redirect and flush once the
    // callback lands and a Google calendar exists to target (see
    // useCompleteAuthentication) — flushing here would have no Google
    // calendar yet and land events on the local calendar instead.
    isConnectingRef.current = true;
    setIsConnecting(true);

    const start = async () => {
      settingsActions.closeCmdPalette();

      // The sync service owns the OAuth round-trip, so the browser just
      // navigates to the consent URL it mints. No client-side code exchange
      // happens here; the connection is linked when Google calls back to the
      // sync service. Reconnect binds the flow to the primary connection id
      // from metadata so the wrong account cannot spawn a second.
      try {
        const beginRequest =
          state === "RECONNECT_REQUIRED" && syncConnection?.id
            ? { connectionId: syncConnection.id as ConnectionId }
            : {};
        const { authorizationUrl } =
          await AuthApi.beginGoogleConnection(beginRequest);
        window.location.assign(authorizationUrl);
      } catch {
        stopConnecting();
        showErrorToast(
          "We couldn't start connecting your Google Calendar. Please try again.",
          { toastId: GOOGLE_CONNECT_FAILED_TOAST_ID },
        );
      }
    };

    void start();
  }, [state, stopConnecting, syncConnection?.id]);

  const onRefreshGoogle = useCallback(
    (options?: { silent?: boolean }) => {
      if (isConnectingRef.current || refreshSnapshot.isRefreshing) {
        return;
      }

      if (!options?.silent) {
        settingsActions.closeCmdPalette();
      }

      void refreshGoogleSync()
        .then((result) => {
          void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
          if (
            !options?.silent &&
            result.inFlight > 0 &&
            result.enqueued === 0
          ) {
            getToast().info("Already refreshing your calendars", {
              toastId: GOOGLE_REFRESH_ALREADY_IN_FLIGHT_TOAST_ID,
            });
          }
        })
        .catch(() => {
          // A background-triggered refresh (tab focus) failing transiently
          // isn't worth interrupting the user for — only a refresh they
          // explicitly asked for surfaces the failure.
          if (!options?.silent) {
            showErrorToast(
              "We couldn't refresh your calendar. Please try again in a moment.",
              { toastId: GOOGLE_REFRESH_FAILED_TOAST_ID },
            );
          }
        });
    },
    [queryClient, refreshSnapshot.isRefreshing],
  );

  return {
    ...getGoogleConnectionConfig(
      state,
      {
        onConnectGoogle: onOpenGoogleAuth,
        onRefreshGoogle,
      },
      {
        refreshGaveUp: refreshSnapshot.gaveUp,
      },
    ),
    connect: onOpenGoogleAuth,
    connection: syncConnection,
    refresh: onRefreshGoogle,
    isAvailable,
    isConnecting,
    isRefreshing,
    state,
  };
};
