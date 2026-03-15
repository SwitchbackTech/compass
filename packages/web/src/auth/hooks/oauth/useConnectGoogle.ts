import { useCallback } from "react";
import {
  type GoogleConnectionStatus,
  type GoogleSyncStatus,
  type UserMetadata,
} from "@core/types/user.types";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { SyncApi } from "@web/common/apis/sync.api";
import {
  selectGoogleMetadata,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import type { UserMetadataStatus } from "@web/ducks/auth/slices/user-metadata.slice";
import { selectImportGCalState } from "@web/ducks/events/selectors/sync.selector";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import type { RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

type GoogleUiState =
  | "checking"
  | "not_connected"
  | "reconnect_required"
  | "connected_healthy"
  | "connected_repairing"
  | "connected_attention";

type SidebarStatusIcon =
  | "CloudArrowUpIcon"
  | "LinkBreakIcon"
  | "CheckCircleIcon"
  | "SpinnerIcon"
  | "CloudWarningIcon";

type CommandActionIcon = "CloudArrowUpIcon";

type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    isDisabled: boolean;
    onSelect?: () => void;
  };
  sidebarStatus: {
    icon: SidebarStatusIcon;
    tooltip: string;
    isDisabled: boolean;
    onSelect?: () => void;
  };
};

const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";

const getGoogleUiState = ({
  connectionStatus,
  syncStatus,
  isImporting,
  isCheckingStatus,
}: {
  connectionStatus: GoogleConnectionStatus;
  syncStatus: GoogleSyncStatus;
  isImporting: boolean;
  isCheckingStatus: boolean;
}): GoogleUiState => {
  if (connectionStatus === "reconnect_required") {
    return "reconnect_required";
  }

  if (isImporting) {
    return "connected_repairing";
  }

  if (isCheckingStatus) {
    return "checking";
  }

  if (connectionStatus === "connected" && syncStatus === "REPAIRING") {
    return "connected_repairing";
  }

  if (connectionStatus === "connected" && syncStatus === "ATTENTION") {
    return "connected_attention";
  }

  if (connectionStatus === "connected") {
    return "connected_healthy";
  }

  return "not_connected";
};

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
          isDisabled: true,
        },
      };
    case "not_connected":
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
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
      };
    case "reconnect_required":
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
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
      };
    case "connected_repairing":
      return {
        commandAction: {
          label: "Syncing Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "SpinnerIcon",
          tooltip: "Google Calendar is syncing in the background.",
          isDisabled: true,
        },
      };
    case "connected_attention":
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
          isDisabled: false,
          onSelect: onRepairGoogleFromSidebar,
        },
      };
    case "connected_healthy":
      return {
        commandAction: {
          label: "Google Calendar Connected",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "CheckCircleIcon",
          tooltip: "Google Calendar connected.",
          isDisabled: true,
        },
      };
  }
};

export const useConnectGoogle = () => {
  const dispatch = useAppDispatch();
  const googleMetadata = useAppSelector(
    selectGoogleMetadata as (
      state: RootState,
    ) => UserMetadata["google"] | undefined,
  );
  const userMetadataStatus = useAppSelector(
    selectUserMetadataStatus as (state: RootState) => UserMetadataStatus,
  );
  const importGCal = useAppSelector(
    selectImportGCalState as (
      state: RootState,
    ) => RootState["sync"]["importGCal"],
  );
  const connectionStatus = googleMetadata?.connectionStatus ?? "not_connected";
  const syncStatus = googleMetadata?.syncStatus ?? "NONE";
  const { login } = useGoogleAuth();

  const onOpenGoogleAuth = useCallback(() => {
    void login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const onRepairGoogleCalendarBase = useCallback(() => {
    const run = async () => {
      dispatch(importGCalSlice.actions.clearImportResults(undefined));
      dispatch(importGCalSlice.actions.setIsImportPending(true));

      try {
        await SyncApi.importGCal({ force: true });
      } catch (error) {
        console.error("Failed to start Google Calendar repair:", error);
        dispatch(importGCalSlice.actions.setIsImportPending(false));
        dispatch(importGCalSlice.actions.importing(false));
        dispatch(
          importGCalSlice.actions.setImportError(
            "Failed to start Google Calendar repair.",
          ),
        );
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

  const isCheckingStatus =
    !googleMetadata &&
    userMetadataStatus !== "loaded" &&
    hasUserEverAuthenticated();
  const state = getGoogleUiState({
    connectionStatus,
    syncStatus,
    isImporting: importGCal.importing,
    isCheckingStatus,
  });

  return getGoogleUiConfig(
    state,
    onOpenGoogleAuth,
    onRepairGoogleCalendar,
    onRepairGoogleCalendarFromSidebar,
  );
};
