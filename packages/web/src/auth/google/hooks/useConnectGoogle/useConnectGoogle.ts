import { useCallback, useSyncExternalStore } from "react";
import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { type GoogleConnectionState } from "@core/types/user.types";
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import {
  clearGoogleSyncIndicatorOverride,
  getGoogleSyncIndicatorOverride,
  setRepairingSyncIndicatorOverride,
  subscribeToGoogleSyncUIState,
} from "@web/auth/google/state/google.sync.state";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import { SyncApi } from "@web/common/apis/sync.api";
import { getApiErrorCode, isApiError } from "@web/common/apis/util/api.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import { type UserMetadataStatus } from "@web/ducks/auth/slices/user-metadata.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { type RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useIsGoogleAvailable } from "../useIsGoogleAvailable/useIsGoogleAvailable";
import {
  type GoogleUiState,
  type UseConnectGoogleResult,
} from "./useConnectGoogle.types";
import { getGoogleConnectionConfig } from "./useConnectGoogle.util";

// Merges Redux-derived Google connection state with transient UI overrides from
// google.sync.ui.state.ts; the override is read via useSyncExternalStore so React
// stays aligned with that external store (see comments there).

export const useConnectGoogle = (): UseConnectGoogleResult => {
  const dispatch = useAppDispatch();
  const isAvailable = useIsGoogleAvailable();
  const connectionState = useAppSelector(
    selectGoogleConnectionState as (state: RootState) => GoogleConnectionState,
  );
  const userMetadataStatus = useAppSelector(
    selectUserMetadataStatus as (state: RootState) => UserMetadataStatus,
  );
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

      dispatch(settingsSlice.actions.closeCmdPalette());
      void startGoogleAuthorization();
    };

    void start();
  }, [dispatch, startGoogleAuthorization]);

  const onRepairGoogle = useCallback(() => {
    const startRepair = async () => {
      dispatch(settingsSlice.actions.closeCmdPalette());
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
  }, [dispatch]);

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
