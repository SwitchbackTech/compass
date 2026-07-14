import { type Icon } from "@phosphor-icons/react";
import { type GoogleConnectionState } from "@core/types/user.types";

export type GoogleUiState = "checking" | "repairing" | GoogleConnectionState;

export type CommandActionIcon = Icon;

export type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    onSelect: () => void;
  } | null;
};

export type UseConnectGoogleResult = GoogleUiConfig & {
  isAvailable: boolean;
  state: GoogleUiState;
};
