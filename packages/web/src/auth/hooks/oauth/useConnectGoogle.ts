import type { AxiosError } from "axios";
import { useCallback } from "react";
import { GOOGLE_REVOKED } from "@core/constants/websocket.constants";
import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import { type GoogleConnectionState } from "@core/types/user.types";
import { syncPendingLocalEvents } from "@web/auth/google/google.auth.util";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { AuthApi } from "@web/common/apis/auth.api";
import { getApiErrorCode } from "@web/common/apis/compass.api.util";
import { SyncApi } from "@web/common/apis/sync.api";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { type ConnectionStatusIcon } from "@web/common/types/icon.types";
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

/**
 * UI state for Google Calendar connection.
 * "checking" is a client-only state for loading, the rest map directly
 * to GoogleConnectionState from the server.
 */
type GoogleUiState = "checking" | "repairing" | GoogleConnectionState;

type CommandActionIcon = "CloudArrowUpIcon";

type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    isDisabled: boolean;
    onSelect?: () => void;
  };
  sidebarStatus: {
    icon: ConnectionStatusIcon;
    tooltip: string;
    tone?: "default" | "warning";
    isDisabled: boolean;
    onSelect?: () => void;
  };
};

const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";
const GOOGLE_REPAIR_FAILED_MESSAGE =
  "Google Calendar repair failed. Please try again.";

const buildGoogleConnectRequest = (
  redirectURIInfo: GoogleAuthCodeRequest["redirectURIInfo"],
): GoogleAuthCodeRequest => ({
  thirdPartyId: "google",
  clientType: "web",
  redirectURIInfo,
});

const getGoogleUiConfig = (
  state: GoogleUiState,
  onConnectGoogle: () => void,
  onRepairGoogle: () => void,
  onRepairGoogleFromSidebar: () => void,
): GoogleUiConfig => {
  switch (state) {
    case "checking":
      return {
        commandAction: {
          label: "Checking Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "SpinnerIcon",
          tooltip: "Checking Google Calendar status…",
          tone: "default",
          isDisabled: true,
        },
      };
    case "repairing":
      return {
        commandAction: {
          label: "Repairing Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "SpinnerIcon",
          tooltip: "Repairing Google Calendar in the background.",
          tone: "warning",
          isDisabled: true,
        },
      };
    case "NOT_CONNECTED":
      return {
        commandAction: {
          label: "Connect Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
        sidebarStatus: {
          icon: "CloudArrowUpIcon",
          tooltip: "Google Calendar not connected. Click to connect.",
          tone: "default",
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
      };
    case "RECONNECT_REQUIRED":
      return {
        commandAction: {
          label: "Reconnect Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
        sidebarStatus: {
          icon: "LinkBreakIcon",
          tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
          tone: "default",
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
      };
    case "IMPORTING":
      return {
        commandAction: {
          label: "Syncing Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "SpinnerIcon",
          tooltip: "Google Calendar is syncing in the background.",
          tone: "default",
          isDisabled: true,
        },
      };
    case "ATTENTION":
      return {
        commandAction: {
          label: "Repair Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onRepairGoogle,
        },
        sidebarStatus: {
          icon: "CloudWarningIcon",
          tooltip: "Google Calendar needs repair. Click to repair.",
          tone: "warning",
          isDisabled: false,
          onSelect: onRepairGoogleFromSidebar,
        },
      };
    case "HEALTHY":
      return {
        commandAction: {
          label: "Google Calendar Connected",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "LinkIcon",
          tooltip: "Google Calendar connected.",
          tone: "default",
          isDisabled: true,
        },
      };
  }
};

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
        return;
      }

      const googleConnectRequest = buildGoogleConnectRequest(
        data.redirectURIInfo,
      );
      await AuthApi.connectGoogle(googleConnectRequest);
      await refreshUserMetadata();
      dispatch(triggerFetch());
    },
    prompt: "consent",
  });

  const onOpenGoogleAuth = useCallback(() => {
    void login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const onRepairGoogleCalendarBase = useCallback(() => {
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
          importGCalSlice.actions.setImportError(GOOGLE_REPAIR_FAILED_MESSAGE),
        );
        showErrorToast(GOOGLE_REPAIR_FAILED_MESSAGE, {
          toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
        });
      }
    };
    void run();
  }, [dispatch]);

  const onRepairGoogleCalendar = useCallback(() => {
    dispatch(settingsSlice.actions.closeCmdPalette());
    onRepairGoogleCalendarBase();
  }, [dispatch, onRepairGoogleCalendarBase]);

  const onRepairGoogleCalendarFromSidebar = useCallback(() => {
    onRepairGoogleCalendarBase();
  }, [onRepairGoogleCalendarBase]);

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

  return getGoogleUiConfig(
    state,
    onOpenGoogleAuth,
    onRepairGoogleCalendar,
    onRepairGoogleCalendarFromSidebar,
  );
};
