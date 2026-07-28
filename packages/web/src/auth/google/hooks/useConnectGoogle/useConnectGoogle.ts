import { useCallback, useRef, useState } from "react";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { AuthApi } from "@web/api/auth.api";
import { SyncApi } from "@web/api/sync.api";
import { getApiErrorCode, isApiError } from "@web/api/util/api.util";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import {
  clearGoogleSyncIndicatorOverride,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import {
  selectGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import {
  GOOGLE_CONNECT_FAILED_TOAST_ID,
  GOOGLE_REPAIR_FAILED_TOAST_ID,
} from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { settingsActions } from "@web/settings/settings.store";
import {
  useIsConnectDelegatedToSync,
  useIsGoogleAvailable,
} from "../useIsGoogleAvailable/useIsGoogleAvailable";
import { type UseConnectGoogleResult } from "./useConnectGoogle.types";
import { getGoogleConnectionConfig } from "./useConnectGoogle.util";
import { useGoogleUiState } from "./useGoogleUiState";

export const useConnectGoogle = (): UseConnectGoogleResult => {
  const isAvailable = useIsGoogleAvailable();
  const isConnectDelegatedToSync = useIsConnectDelegatedToSync();
  const state = useGoogleUiState();
  const syncConnection = useUserMetadataStore(selectGoogleSyncConnection);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);
  const { startGoogleAuthorization } = useStartGoogleAuthorization({
    intent: "connectCalendar",
    prompt: "consent",
  });

  const stopConnecting = useCallback(() => {
    isConnectingRef.current = false;
    setIsConnecting(false);
  }, []);

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

      if (!isConnectDelegatedToSync) {
        void startGoogleAuthorization();
        return;
      }

      // Sync-delegated connect: the sync service owns the OAuth round-trip, so
      // the browser just navigates to the consent URL it mints. No client-side
      // code exchange happens here; the connection is linked when Google calls
      // back to the sync service. Reconnect binds the flow to the primary
      // connection id from metadata so the wrong account cannot spawn a second.
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
  }, [
    isConnectDelegatedToSync,
    startGoogleAuthorization,
    state,
    stopConnecting,
    syncConnection?.id,
  ]);

  const onRepairGoogle = useCallback(() => {
    const startRepair = async () => {
      setRepairingSyncIndicatorOverride();

      try {
        await SyncApi.importGCal({ force: true });
      } catch (error) {
        clearGoogleSyncIndicatorOverride();
        // "GOOGLE_REVOKED" here is the HTTP error envelope code (independent
        // of the syncStatusChanged SSE code of the same name, B10).
        const isGoogleRevoked =
          isApiError(error) && getApiErrorCode(error) === "GOOGLE_REVOKED";

        if (isGoogleRevoked) {
          return;
        }

        showErrorToast(
          "We couldn't sync your Google Calendar. Please try again.",
          {
            toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
          },
        );
      }
    };

    void startRepair();
  }, []);

  return {
    ...getGoogleConnectionConfig(state, onOpenGoogleAuth, onRepairGoogle),
    isAvailable,
    isConnecting,
    state,
  };
};
