import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { type SyncStatus } from "@web/calendars/sync-status.types";
import {
  type CommandActionIcon,
  type GoogleUiConfig,
  type GoogleUiState,
} from "./useConnectGoogle.types";

const COMMAND_ICON: CommandActionIcon = CloudArrowUpIcon;

export const getGoogleConnectionConfig = (
  state: GoogleUiState,
  onConnectGoogle: () => void,
  onRepairGoogle: () => void,
): GoogleUiConfig => {
  switch (state) {
    case "checking":
    case "repairing":
    case "IMPORTING":
    case "HEALTHY":
      return { commandAction: null };
    case "NOT_CONNECTED":
      return {
        commandAction: {
          label: "Connect Google Calendar",
          icon: COMMAND_ICON,
          onSelect: onConnectGoogle,
        },
      };
    case "RECONNECT_REQUIRED":
      return {
        commandAction: {
          label: "Reconnect Google Calendar",
          icon: COMMAND_ICON,
          onSelect: onConnectGoogle,
        },
      };
    case "ATTENTION":
      return {
        commandAction: {
          label: "Sync Google Calendar",
          icon: COMMAND_ICON,
          onSelect: onRepairGoogle,
        },
      };
  }
};

export const getGoogleSyncStatus = (state: GoogleUiState): SyncStatus => {
  switch (state) {
    case "HEALTHY":
      return { variant: "healthy", text: "Calendar up-to-date" };
    case "IMPORTING":
    case "repairing":
    case "checking":
      return { variant: "syncing", text: "Syncing calendar…" };
    case "ATTENTION":
      return { variant: "warning", text: "Calendar is out of date" };
    case "RECONNECT_REQUIRED":
      return { variant: "error", text: "Calendar needs reconnecting" };
    case "NOT_CONNECTED":
      return null;
  }
};
