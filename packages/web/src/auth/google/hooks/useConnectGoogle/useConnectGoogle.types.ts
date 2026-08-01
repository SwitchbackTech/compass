import { type Icon } from "@phosphor-icons/react";
import { type GoogleConnectionState } from "@core/types/user.types";

export type GoogleUiState = "checking" | GoogleConnectionState;

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
  /** True while any Compass surface is requesting a Sync refresh. */
  isRefreshing: boolean;
  state: GoogleUiState;
  /**
   * Start connect/reconnect: flushes pending local events, then navigates to
   * the sync service's OAuth consent URL. The same trigger
   * `commandAction.onSelect` wraps this for the sidebar — call this directly
   * from other surfaces (e.g. a toast) instead of reimplementing it
   * (google-reconnect.toast.tsx).
   */
  connect: () => void;
  /**
   * Enqueue Sync catch-up pulls for the signed-in user's calendars. Used by
   * the ATTENTION / delayed Refresh CTA, the delayed toast, and an automatic
   * focus-triggered check (useSyncFocusRefresh). Pass `silent: true` for a
   * background trigger the user didn't ask for, so a transient failure
   * doesn't surface an error toast or close an open command palette. All
   * callers share one in-flight request.
   */
  refresh: (options?: { silent?: boolean }) => void;
};
