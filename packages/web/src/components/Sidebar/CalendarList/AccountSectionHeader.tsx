import { type FC } from "react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  formatLastSyncedLabel,
  getGoogleSyncStatus,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { type SyncStatusVariant } from "@web/calendars/sync-status.types";

// Status is conveyed as text, never colour alone, so the variant class is
// decoration on top of a message that already says what is happening.
const SYNC_STATUS_VARIANT_CLASSNAME: Record<SyncStatusVariant, string> = {
  syncing: "c-sync-text-wave",
  healthy: "text-text",
  warning: "text-warning",
  error: "text-error",
};

/**
 * Heading for one connected account's calendars: the account email, that
 * account's own sync status, and its own reconnect/refresh action. Rendered
 * only when more than one account is connected - with a single account the
 * calendar list heading already carries all of this.
 */
export const AccountSectionHeader: FC<{
  accountEmail: string;
  connection: GoogleSyncConnectionSummary | undefined;
}> = ({ accountEmail, connection }) => {
  const { commandAction, isAvailable, isConnecting, isRefreshing, state } =
    useConnectGoogle({ connection });
  const syncStatus = getGoogleSyncStatus(state, connection);
  const isSyncing = syncStatus?.variant === "syncing";
  const lastSyncedLabel =
    syncStatus?.variant === "healthy"
      ? formatLastSyncedLabel(connection?.lastSyncedAt)
      : null;
  const actionLabel =
    commandAction == null
      ? null
      : isConnecting
        ? "Reconnecting…"
        : isRefreshing
          ? "Refreshing…"
          : commandAction.label;

  return (
    <div className="mb-1.5">
      <h3
        className={`mb-0.5 min-w-0 truncate font-semibold text-xs leading-none ${
          isSyncing ? "c-sync-text-wave" : "text-text"
        }`}
        translate="no"
      >
        {accountEmail}
      </h3>
      {syncStatus ? (
        <p
          aria-live="polite"
          className={`text-xs ${SYNC_STATUS_VARIANT_CLASSNAME[syncStatus.variant]}`}
          role="status"
        >
          {syncStatus.text}
        </p>
      ) : null}
      {lastSyncedLabel ? (
        <p className="text-text-muted text-xs">{lastSyncedLabel}</p>
      ) : null}
      {isAvailable && commandAction != null && actionLabel != null ? (
        <button
          aria-busy={isConnecting || isRefreshing || undefined}
          aria-label={`${actionLabel} for ${accountEmail}`}
          className="c-focus-ring mt-1 rounded-xs px-1.5 py-0.5 text-accent text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
          disabled={isConnecting || isRefreshing}
          onClick={commandAction.onSelect}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
