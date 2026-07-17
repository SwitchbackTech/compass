import { useCallback } from "react";
import { SyncApi } from "@web/api/sync.api";
import { getApiErrorCode, isApiError } from "@web/api/util/api.util";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import {
  clearGoogleSyncIndicatorOverride,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { settingsActions } from "@web/settings/settings.store";
import { useIsGoogleAvailable } from "../useIsGoogleAvailable/useIsGoogleAvailable";
import { type UseConnectGoogleResult } from "./useConnectGoogle.types";
import { getGoogleConnectionConfig } from "./useConnectGoogle.util";
import { useGoogleUiState } from "./useGoogleUiState";

export const useConnectGoogle = (): UseConnectGoogleResult => {
  const isAvailable = useIsGoogleAvailable();
  const state = useGoogleUiState();
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
    state,
  };
};
