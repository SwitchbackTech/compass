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
  /** True while connect/reconnect OAuth is starting (before redirect). */
  isConnecting: boolean;
  state: GoogleUiState;
  /**
   * Start connect/reconnect: flushes pending local events, then navigates to
   * the sync service's OAuth consent URL. The same trigger
   * `commandAction.onSelect` wraps for the command palette — call this
   * directly from any other surface (e.g. a toast) instead of reimplementing
   * it (google-reconnect.toast.tsx).
   */
  connect: () => void;
};
