import { type GoogleConnectionState } from "@core/types/user.types";

export type GoogleUiState = "checking" | "repairing" | GoogleConnectionState;

export type CommandActionIcon = "CloudArrowUpIcon";

export type GoogleAccountSummaryStatus = {
  variant: "syncing" | "healthy" | "warning" | "error";
  tooltip: string;
  action?: { label: string; onClick: () => void };
} | null;

export type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    isDisabled: boolean;
    onSelect?: () => void;
  };
};

export type UseConnectGoogleResult = GoogleUiConfig & {
  isAvailable: boolean;
  state: GoogleUiState;
  onRepairGoogle: () => void;
  onOpenGoogleAuth: () => void;
};
