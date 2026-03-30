import { type GoogleConnectionState } from "@core/types/user.types";
import { type ConnectionStatusIcon } from "@web/common/types/icon.types";

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
    icon: ConnectionStatusIcon;
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
