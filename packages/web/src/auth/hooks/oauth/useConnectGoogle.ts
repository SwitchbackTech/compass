import { useCallback } from "react";
import {
  type GoogleConnectionStatus,
  type GoogleSyncStatus,
} from "@core/types/user.types";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { selectGoogleMetadata } from "@web/ducks/auth/selectors/user-metadata.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

type GoogleUiState =
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

const COMMAND_LABEL = "Connect Google Calendar";
const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";

const getGoogleUiState = ({
  connectionStatus,
  syncStatus,
}: {
  connectionStatus: GoogleConnectionStatus;
  syncStatus: GoogleSyncStatus;
}): GoogleUiState => {
  if (connectionStatus === "reconnect_required") {
    return "reconnect_required";
  }

  if (connectionStatus === "connected" && syncStatus === "repairing") {
    return "connected_repairing";
  }

  if (connectionStatus === "connected" && syncStatus === "attention") {
    return "connected_attention";
  }

  if (connectionStatus === "connected") {
    return "connected_healthy";
  }

  return "not_connected";
};

const getGoogleUiConfig = (
  state: GoogleUiState,
  onOpenGoogleAuth: () => void,
): GoogleUiConfig => {
  switch (state) {
    case "not_connected":
      return {
        commandAction: {
          label: COMMAND_LABEL,
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onOpenGoogleAuth,
        },
        sidebarStatus: {
          icon: "CloudArrowUpIcon",
          tooltip: "Google Calendar not connected. Click to connect.",
          isDisabled: false,
          onSelect: onOpenGoogleAuth,
        },
      };
    case "reconnect_required":
      return {
        commandAction: {
          label: COMMAND_LABEL,
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onOpenGoogleAuth,
        },
        sidebarStatus: {
          icon: "LinkBreakIcon",
          tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
          isDisabled: false,
          onSelect: onOpenGoogleAuth,
        },
      };
    case "connected_repairing":
      return {
        commandAction: {
          label: COMMAND_LABEL,
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
          label: COMMAND_LABEL,
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onOpenGoogleAuth,
        },
        sidebarStatus: {
          icon: "CloudWarningIcon",
          tooltip: "Google Calendar needs repair. Click to reconnect.",
          isDisabled: false,
          onSelect: onOpenGoogleAuth,
        },
      };
    case "connected_healthy":
      return {
        commandAction: {
          label: COMMAND_LABEL,
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
  const googleMetadata = useAppSelector(selectGoogleMetadata);
  const { login } = useGoogleAuth();

  const onOpenGoogleAuth = useCallback(() => {
    login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const connectionStatus = googleMetadata?.connectionStatus ?? "not_connected";
  const syncStatus = googleMetadata?.syncStatus ?? "none";
  const state = getGoogleUiState({ connectionStatus, syncStatus });

  return getGoogleUiConfig(state, onOpenGoogleAuth);
};
