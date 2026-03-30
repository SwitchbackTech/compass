import { type AxiosError, isAxiosError } from "axios";
import { useCallback } from "react";
import { GOOGLE_REVOKED } from "@core/constants/websocket.constants";
import { type GoogleConnectionState } from "@core/types/user.types";
import { syncPendingLocalEvents } from "@web/auth/google/google.auth.util";
import { useGoogleAuth } from "@web/auth/hooks/google/useGoogleAuth/useGoogleAuth";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { AuthApi } from "@web/common/apis/auth.api";
import {
  getApiErrorCode,
  getApiErrorMessage,
} from "@web/common/apis/compass.api.util";
import { SyncApi } from "@web/common/apis/sync.api";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import type { UserMetadataStatus } from "@web/ducks/auth/slices/user-metadata.slice";
import { selectImportGCalState } from "@web/ducks/events/selectors/sync.selector";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import type { RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type GoogleUiState } from "./useConnectGoogle.types";
import {
  buildGoogleConnectRequest,
  getGoogleConnectionConfig,
} from "./useConnectGoogle.util";

export const useConnectGoogle = () => {
  const dispatch = useAppDispatch();
  const connectionState = useAppSelector(
    selectGoogleConnectionState as (state: RootState) => GoogleConnectionState,
  );
  const userMetadataStatus = useAppSelector(
    selectUserMetadataStatus as (state: RootState) => UserMetadataStatus,
  );
  const { isRepairing } = useAppSelector(
    selectImportGCalState as (state: RootState) => {
      isRepairing: boolean;
    },
  );
  const { login } = useGoogleAuth({
    onSuccess: async (data) => {
      const didSyncLocalEvents = await syncPendingLocalEvents(dispatch);
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
          const message = getApiErrorMessage(error);

          if (message) {
            showErrorToast(message);
            return false;
          }
        }

        throw error;
      }
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
    dispatch(settingsSlice.actions.closeCmdPalette());
    const run = async () => {
      dispatch(importGCalSlice.actions.clearImportResults(undefined));
      dispatch(importGCalSlice.actions.startRepair());
      try {
        await SyncApi.importGCal({ force: true });
      } catch (error) {
        dispatch(importGCalSlice.actions.stopRepair());

        const isGoogleRevoked =
          getApiErrorCode(error as AxiosError) === GOOGLE_REVOKED;
        if (isGoogleRevoked) {
          return;
        }

        dispatch(
          importGCalSlice.actions.setImportError(
            "Google Calendar repair failed. Please try again.",
          ),
        );
        showErrorToast("Google Calendar repair failed. Please try again.", {
          toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
        });
      }
    };
    void run();
  }, [dispatch]);

  // "checking" is a UI-only state until we have loaded metadata from the server.
  // Covers both "idle" (before refreshUserMetadata dispatches setLoading) and
  // "loading" so returning users do not briefly see NOT_CONNECTED from the selector default.
  const isCheckingStatus =
    hasUserEverAuthenticated() && userMetadataStatus !== "loaded";

  const state: GoogleUiState = isRepairing
    ? "repairing"
    : isCheckingStatus
      ? "checking"
      : connectionState;

  return getGoogleConnectionConfig(state, onOpenGoogleAuth, onRepairGoogle);
};
