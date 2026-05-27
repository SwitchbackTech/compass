import { theme } from "@web/common/styles/theme";
import {
  type CommandActionIcon,
  type GoogleAccountSummaryStatus,
  type GoogleUiConfig,
  type GoogleUiState,
} from "./useConnectGoogle.types";

const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";
const SYNCING_ACCOUNT_SUMMARY_LABEL = "Syncing...";
type RepairDialog = NonNullable<GoogleUiConfig["sidebarStatus"]["dialog"]>;

const buildRepairDialog = (onRepairGoogle: () => void): RepairDialog => ({
  title: "Calendar sync needs repair",
  description:
    "Your Google Calendar has run into a sync issue. Repairing will re-import your recent events to make sure everything is up to date.",
  repairLabel: "Repair",
  onRepair: onRepairGoogle,
});

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
        sidebarStatus: {
          tooltip: "Checking Google Calendar status…",
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
          iconColor: theme.color.status.warning,
          tooltip: "Repairing Google Calendar in the background.",
          isDisabled: true,
          dialog: buildRepairDialog(onRepairGoogle),
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
          tooltip: "Google Calendar not connected. Click to connect.",
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
          iconColor: theme.color.status.error,
          tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
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
          tooltip: "Google Calendar is syncing in the background.",
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
          iconColor: theme.color.status.warning,
          tooltip: "Google Calendar needs repair. Click to repair.",
          isDisabled: false,
          dialog: buildRepairDialog(onRepairGoogle),
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
          tooltip: "Google Calendar connected.",
          isDisabled: true,
        },
      };
  }
};

export const getGoogleAccountSummaryStatus = (
  state: GoogleUiState,
): GoogleAccountSummaryStatus => {
  switch (state) {
    case "HEALTHY":
      return {
        isHealthy: true,
        isLoading: false,
        label: "Synced with Google",
      };
    case "IMPORTING":
    case "repairing":
      return {
        isHealthy: false,
        isLoading: false,
        label: SYNCING_ACCOUNT_SUMMARY_LABEL,
      };
    case "checking":
      return {
        isHealthy: false,
        isLoading: true,
        label: SYNCING_ACCOUNT_SUMMARY_LABEL,
      };
    case "RECONNECT_REQUIRED":
      return {
        isHealthy: false,
        isLoading: false,
        label: "Reconnect needed",
      };
    case "ATTENTION":
      return {
        isHealthy: false,
        isLoading: false,
        label: "Repair needed",
      };
    case "NOT_CONNECTED":
      return null;
  }
};
