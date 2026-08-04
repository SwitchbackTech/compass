import { type FC } from "react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  formatLastSyncedLabel,
  getGoogleSyncStatus,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useCollapsedAccountKeys } from "@web/calendars/collapsed-accounts.store";
import { SyncStatusLine } from "@web/calendars/SyncStatusLine";
import { AccountDisclosureHeading } from "./AccountDisclosureHeading";
import { AddAccountButton } from "./AddAccountButton";

/**
 * Heading for one connected account's calendars: the account email (also the
 * collapse toggle for its calendar rows, see CalendarList.tsx), that
 * account's own sync status, and its own reconnect/refresh action. Rendered
 * only when more than one account is connected - with a single account the
 * calendar list heading already carries all of this. Adding/disconnecting
 * accounts lives in the command palette's "Add/remove accounts" (a full
 * account-management surface) and this heading's own hover-revealed plus
 * icon - not a permanent row here, which stayed noisy for accounts with many
 * subcalendars.
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
  const collapsedKeys = useCollapsedAccountKeys();
  const isCollapsed = collapsedKeys.has(accountEmail);

  return (
    <div className="mb-1.5">
      <div className="group/header mb-0.5 flex min-w-0 items-center justify-between gap-1">
        <AccountDisclosureHeading
          as="h3"
          caretSize={10}
          className="text-xs"
          collapseKey={accountEmail}
          email={accountEmail}
          isCollapsed={isCollapsed}
          isSyncing={isSyncing}
        />
        <AddAccountButton />
      </div>
      <SyncStatusLine status={syncStatus} />
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
