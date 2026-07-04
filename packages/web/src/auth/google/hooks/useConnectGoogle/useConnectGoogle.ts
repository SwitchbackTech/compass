import { useCallback, useSyncExternalStore } from "react";
import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import {
  clearGoogleSyncIndicatorOverride,
  getGoogleSyncIndicatorOverride,
  setRepairingSyncIndicatorOverride,
  subscribeToGoogleSyncUIState,
} from "@web/auth/google/state/google.sync.state";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { SyncApi } from "@web/common/apis/sync.api";
import { getApiErrorCode, isApiError } from "@web/common/apis/util/api.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { settingsActions } from "@web/settings/settings.store";
import { useIsGoogleAvailable } from "../useIsGoogleAvailable/useIsGoogleAvailable";
import {
  type GoogleUiState,
  type UseConnectGoogleResult,
} from "./useConnectGoogle.types";
import { getGoogleConnectionConfig } from "./useConnectGoogle.util";

// Merges store-derived Google connection state with transient UI overrides from
// google.sync.ui.state.ts; the override is read via useSyncExternalStore so React
// stays aligned with that external store (see comments there).

export const useConnectGoogle = (): UseConnectGoogleResult => {
  const isAvailable = useIsGoogleAvailable();
  const connectionState = useUserMetadataStore(selectGoogleConnectionState);
  const userMetadataStatus = useUserMetadataStore(selectUserMetadataStatus);
  const syncIndicator = useSyncExternalStore(
    subscribeToGoogleSyncUIState,
    getGoogleSyncIndicatorOverride,
    getGoogleSyncIndicatorOverride,
  );
  const { startGoogleAuthorization } = useStartGoogleAuthorization({
    intent: "connectCalendar",
    prompt: "consent",
  });

  const onOpenGoogleAuth = useCallback(() => {
    const start = async () => {
      const didSyncLocalEvents = await syncPendingLocalEvents();

      if (!didSyncLocalEvents) {
        return;
      }

      settingsActions.closeCmdPalette();
      void startGoogleAuthorization();
    };

    void start();
  }, [startGoogleAuthorization]);

  const onRepairGoogle = useCallback(() => {
    const startRepair = async () => {
      settingsActions.closeCmdPalette();
      setRepairingSyncIndicatorOverride();

      try {
        await SyncApi.importGCal({ force: true });
      } catch (error) {
        clearGoogleSyncIndicatorOverride();
        const isGoogleRevoked =
          isApiError(error) && getApiErrorCode(error) === GOOGLE_REVOKED;

        if (isGoogleRevoked) {
          return;
        }

        showErrorToast("Google Calendar sync failed. Please try again.", {
          toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
        });
      }
    };

    void startRepair();
  }, []);

  // "checking" is a UI-only state until we have loaded metadata from the server.
  // Covers both "idle" and "loading" so returning users do not briefly see
  // NOT_CONNECTED from the selector default.
  const isCheckingStatus =
    hasUserEverAuthenticated() && userMetadataStatus !== "loaded";

  const state: GoogleUiState =
    syncIndicator === "repairing"
      ? "repairing"
      : syncIndicator === "syncing"
        ? "IMPORTING"
        : isCheckingStatus
          ? "checking"
          : connectionState;

  return {
    ...getGoogleConnectionConfig(state, onOpenGoogleAuth, onRepairGoogle),
    isAvailable,
    state,
    onRepairGoogle,
    onOpenGoogleAuth,
  };
};
