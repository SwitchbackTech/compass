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
   * Start connect/reconnect: flushes pending local events, then forks to the
   * sync redirect flow or the legacy popup depending on delegation. The same
   * trigger `commandAction.onSelect` wraps for the command palette — call
   * this directly from any other surface (e.g. a toast) instead of
   * reimplementing the fork, which is exactly how it drifted out of sync
   * with the legacy-only popup before (google-reconnect.toast.tsx).
   */
  connect: () => void;
};
