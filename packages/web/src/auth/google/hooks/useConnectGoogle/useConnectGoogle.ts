import { useCallback, useEffect, useRef, useState } from "react";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { AuthApi } from "@web/api/auth.api";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import {
  selectGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { GOOGLE_CONNECT_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { settingsActions } from "@web/settings/settings.store";
import { useIsConnectGoogleAvailable } from "../useIsGoogleAvailable/useIsGoogleAvailable";
import { type UseConnectGoogleResult } from "./useConnectGoogle.types";
import { getGoogleConnectionConfig } from "./useConnectGoogle.util";
import { useGoogleUiState } from "./useGoogleUiState";

export const useConnectGoogle = (): UseConnectGoogleResult => {
  const isAvailable = useIsConnectGoogleAvailable();
  const state = useGoogleUiState();
  const syncConnection = useUserMetadataStore(selectGoogleSyncConnection);
  const [isConnecting, setIsConnecting] = useState(false);
  // Sync guard so rapid re-clicks before React re-renders cannot start a
  // second OAuth attempt; isConnecting alone would still be false in-handler.
  const isConnectingRef = useRef(false);
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

  const onOpenGoogleAuth = useCallback(() => {
    if (isConnectingRef.current) {
      return;
    }

    // Show loading on the sidebar/command action immediately — local-event
    // flush and beginGoogleConnection both run before the OAuth redirect.
    isConnectingRef.current = true;
    setIsConnecting(true);

    const start = async () => {
      const didSyncLocalEvents = await syncPendingLocalEvents();

      if (!didSyncLocalEvents) {
        stopConnecting();
        return;
      }

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

  return {
    ...getGoogleConnectionConfig(state, onOpenGoogleAuth),
    connect: onOpenGoogleAuth,
    isAvailable,
    isConnecting,
    state,
  };
};
