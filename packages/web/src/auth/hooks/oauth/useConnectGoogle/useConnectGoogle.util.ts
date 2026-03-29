import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import {
  type CommandActionIcon,
  type GoogleUiConfig,
  type GoogleUiState,
} from "./useConnectGoogle.types";

const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";

export const buildGoogleConnectRequest = (
  redirectURIInfo: GoogleAuthCodeRequest["redirectURIInfo"],
): GoogleAuthCodeRequest => ({
  thirdPartyId: "google",
  clientType: "web",
  redirectURIInfo,
});

export const getGoogleConnectionConfig = (
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
