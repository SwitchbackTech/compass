import {
  type CommandActionIcon,
  type GoogleAccountSummaryStatus,
  type GoogleUiConfig,
  type GoogleUiState,
} from "./useConnectGoogle.types";

const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";

export const getGoogleConnectionConfig = (
  state: GoogleUiState,
  onConnectGoogle: () => void,
  onRepairGoogle: () => void,
): GoogleUiConfig => {
  switch (state) {
    case "checking":
      return {
        commandAction: {
          label: "Checking Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
      };
    case "repairing":
      return {
        commandAction: {
          label: "Syncing Google Calendar…",
          icon: COMMAND_ICON,
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
      };
    case "RECONNECT_REQUIRED":
      return {
        commandAction: {
          label: "Reconnect Google Calendar",
          icon: COMMAND_ICON,
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
      };
    case "ATTENTION":
      return {
        commandAction: {
          label: "Sync Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onRepairGoogle,
        },
      };
    case "HEALTHY":
      return {
        commandAction: {
          label: "Google Calendar Connected",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
      };
  }
};

export const getGoogleAccountSummaryStatus = (
  state: GoogleUiState,
  {
    onRepairGoogle,
    onOpenGoogleAuth,
  }: { onRepairGoogle: () => void; onOpenGoogleAuth: () => void },
): GoogleAccountSummaryStatus => {
  switch (state) {
    case "HEALTHY":
      return {
        variant: "healthy",
        tooltip: "Up-to-date",
      };
    case "IMPORTING":
    case "repairing":
    case "checking":
      return {
        variant: "syncing",
        tooltip: "Syncing...",
      };
    case "ATTENTION":
      return {
        variant: "warning",
        tooltip: "Google Calendar needs a sync",
        action: { label: "Sync now", onClick: onRepairGoogle },
      };
    case "RECONNECT_REQUIRED":
      return {
        variant: "error",
        tooltip: "Google Calendar needs reconnecting",
        action: { label: "Reconnect", onClick: onOpenGoogleAuth },
      };
    case "NOT_CONNECTED":
      return null;
  }
};
