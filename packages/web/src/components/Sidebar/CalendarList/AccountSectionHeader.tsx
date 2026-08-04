import { useQueryClient } from "@tanstack/react-query";
import { type FC, useCallback, useState } from "react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { AuthApi } from "@web/api/auth.api";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  formatLastSyncedLabel,
  getGoogleSyncStatus,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { type SyncStatusVariant } from "@web/calendars/sync-status.types";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";

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
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {isAvailable && commandAction != null && actionLabel != null ? (
          <button
            aria-busy={isConnecting || isRefreshing || undefined}
            aria-label={`${actionLabel} for ${accountEmail}`}
            className="c-focus-ring rounded-xs px-1.5 py-0.5 text-accent text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
            disabled={isConnecting || isRefreshing}
            onClick={commandAction.onSelect}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
        {connection ? (
          <DisconnectAccountAction
            accountEmail={accountEmail}
            connectionId={connection.id}
          />
        ) : null}
      </div>
    </div>
  );
};

/**
 * Removes one account's calendars and events from Compass. Two-step, since it
 * is not undoable without redoing the whole OAuth flow: the first press swaps
 * in an explicit confirm. The user's other accounts, and their Compass
 * sign-in, are untouched.
 */
const DisconnectAccountAction: FC<{
  accountEmail: string;
  connectionId: string;
}> = ({ accountEmail, connectionId }) => {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const disconnect = useCallback(() => {
    setIsDisconnecting(true);
    AuthApi.disconnectGoogleConnection(connectionId)
      .then(async () => {
        // The account's calendars and its events both disappear, and the
        // remaining connections are what drive the sidebar's sections.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: eventQueryKeys.all }),
          refreshUserMetadata({ force: true }),
        ]);
      })
      .catch(() => {
        showErrorToast(
          `We couldn't disconnect ${accountEmail}. Please try again in a moment.`,
        );
      })
      .finally(() => {
        setIsDisconnecting(false);
        setIsConfirming(false);
      });
  }, [accountEmail, connectionId, queryClient]);

  if (!isConfirming) {
    return (
      <button
        aria-label={`Disconnect ${accountEmail}`}
        className="c-focus-ring rounded-xs px-1.5 py-0.5 text-text-muted text-xs hover:text-text"
        onClick={() => setIsConfirming(true)}
        type="button"
      >
        Disconnect
      </button>
    );
  }

  return (
    <>
      <button
        aria-busy={isDisconnecting || undefined}
        aria-label={`Confirm disconnecting ${accountEmail}`}
        className="c-focus-ring rounded-xs px-1.5 py-0.5 text-error text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
        disabled={isDisconnecting}
        onClick={disconnect}
        type="button"
      >
        {isDisconnecting ? "Disconnecting…" : "Confirm disconnect"}
      </button>
      <button
        className="c-focus-ring rounded-xs px-1.5 py-0.5 text-text-muted text-xs hover:text-text disabled:pointer-events-none disabled:opacity-60"
        disabled={isDisconnecting}
        onClick={() => setIsConfirming(false)}
        type="button"
      >
        Cancel
      </button>
    </>
  );
};
