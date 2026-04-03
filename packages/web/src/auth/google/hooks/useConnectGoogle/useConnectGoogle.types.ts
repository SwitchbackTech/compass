import { type GoogleConnectionState } from "@core/types/user.types";

export type GoogleUiState = "checking" | "repairing" | GoogleConnectionState;

export type CommandActionIcon = "CloudArrowUpIcon";

export type IconColor = "muted" | "warning" | "error";

export type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    isDisabled: boolean;
    onSelect?: () => void;
  };
  sidebarStatus: {
    tooltip: string;
    tone?: "default" | "warning";
    isDisabled: boolean;
    iconColor?: IconColor;
    dialog?: {
      title: string;
      description: string;
      repairLabel: string;
      onRepair: () => void;
    };
    onSelect?: () => void;
  };
};

export type UseConnectGoogleResult = GoogleUiConfig & {
  isRepairing: boolean;
  state: GoogleUiState;
};
