import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getSidebarSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";

/**
 * Shared by AccountSectionHeader and CalendarListHeader: this account's sync
 * status plus the label for its connect/reconnect/refresh action, if any.
 */
export function useAccountHeaderStatus(
  connection: GoogleSyncConnectionSummary | null | undefined,
) {
  const { commandAction, isAvailable, isConnecting, isRefreshing, state } =
    useConnectGoogle({ connection });
  const syncStatus = getSidebarSyncStatus({ connection, isConnecting, state });
  const actionLabel =
    commandAction == null
      ? null
      : isConnecting
        ? state === "RECONNECT_REQUIRED"
          ? "Reconnecting…"
          : "Connecting…"
        : isRefreshing
          ? "Catching up…"
          : commandAction.label;

  return {
    actionLabel,
    commandAction,
    isAvailable,
    isConnecting,
    isRefreshing,
    syncStatus,
  };
}
