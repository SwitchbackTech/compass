import { type GoogleConnectionState } from "@core/types/user.types";

export type GoogleUiState = "checking" | "repairing" | GoogleConnectionState;

export type CommandActionIcon = "CloudArrowUpIcon";

export type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    isDisabled: boolean;
    onSelect?: () => void;
  };
  sidebarStatus: {
    tooltip: string;
    isDisabled: boolean;
    iconColor?: string;
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
  isAvailable: boolean;
  isRepairing: boolean;
  state: GoogleUiState;
};
