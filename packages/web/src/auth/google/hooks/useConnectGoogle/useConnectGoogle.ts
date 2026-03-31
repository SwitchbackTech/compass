import { type AxiosError, isAxiosError } from "axios";
import { useCallback, useSyncExternalStore } from "react";
import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { type GoogleConnectionState } from "@core/types/user.types";
import {
  clearGoogleSyncIndicatorOverride,
  getGoogleSyncIndicatorOverride,
  setRepairingSyncIndicatorOverride,
  setSyncingSyncIndicatorOverride,
  subscribeToGoogleSyncUIState,
} from "@web/auth/google/google-sync-ui.state";
import { syncPendingLocalEvents } from "@web/auth/google/google.auth.util";
import { useGoogleAuth } from "@web/auth/google/hooks/useGoogleAuth/useGoogleAuth";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { refreshUserMetadata } from "@web/auth/user/util/user-metadata.util";
import { AuthApi } from "@web/common/apis/auth.api";
import {
  getApiErrorCode,
  parseGoogleConnectError,
} from "@web/common/apis/compass.api.util";
import { SyncApi } from "@web/common/apis/sync.api";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import type { UserMetadataStatus } from "@web/ducks/auth/slices/user-metadata.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import type { RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import {
  type GoogleUiState,
  type UseConnectGoogleResult,
} from "./useConnectGoogle.types";
import {
  buildGoogleConnectRequest,
  getGoogleConnectionConfig,
} from "./useConnectGoogle.util";

export const useConnectGoogle = (): UseConnectGoogleResult => {
  const dispatch = useAppDispatch();
  const connectionState = useAppSelector(
    selectGoogleConnectionState as (state: RootState) => GoogleConnectionState,
  );
  const userMetadataStatus = useAppSelector(
    selectUserMetadataStatus as (state: RootState) => UserMetadataStatus,
  );
  const syncIndicatorOverride = useSyncExternalStore(
    subscribeToGoogleSyncUIState,
    getGoogleSyncIndicatorOverride,
    getGoogleSyncIndicatorOverride,
  );
  const { login } = useGoogleAuth({
    onSuccess: async (data) => {
      const didSyncLocalEvents = await syncPendingLocalEvents();
      if (!didSyncLocalEvents) {
        return false;
      }

      const googleConnectRequest = buildGoogleConnectRequest(
        data.redirectURIInfo,
      );
      try {
        await AuthApi.connectGoogle(googleConnectRequest);
      } catch (error) {
        if (isAxiosError(error)) {
          const message = parseGoogleConnectError(error)?.message;

          if (message) {
            showErrorToast(message);
            return false;
          }
        }

        throw error;
      }

      setSyncingSyncIndicatorOverride();
      await refreshUserMetadata();
      dispatch(triggerFetch());
    },
    prompt: "consent",
  });

  const onOpenGoogleAuth = useCallback(() => {
    void login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const onRepairGoogle = useCallback(() => {
    const startRepair = async () => {
      dispatch(settingsSlice.actions.closeCmdPalette());
      setRepairingSyncIndicatorOverride();

      try {
        await SyncApi.importGCal({ force: true });
      } catch (error) {
        clearGoogleSyncIndicatorOverride();
        const isGoogleRevoked =
          getApiErrorCode(error as AxiosError) === GOOGLE_REVOKED;

        if (isGoogleRevoked) {
          return;
        }

        showErrorToast("Google Calendar repair failed. Please try again.", {
          toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
        });
      }
    };

    void startRepair();
  }, [dispatch]);

  // "checking" is a UI-only state until we have loaded metadata from the server.
  // Covers both "idle" (before refreshUserMetadata dispatches setLoading) and
  // "loading" so returning users do not briefly see NOT_CONNECTED from the selector default.
  const isCheckingStatus =
    hasUserEverAuthenticated() && userMetadataStatus !== "loaded";

  const state: GoogleUiState =
    syncIndicatorOverride === "repairing"
      ? "repairing"
      : syncIndicatorOverride === "syncing"
        ? "IMPORTING"
        : isCheckingStatus
          ? "checking"
          : connectionState;

  return {
    ...getGoogleConnectionConfig(state, onOpenGoogleAuth, onRepairGoogle),
    isRepairing: state === "repairing",
    state,
  };
};
