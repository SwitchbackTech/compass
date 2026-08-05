import { type FC } from "react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useCollapsedAccountKeys } from "@web/calendars/collapsed-accounts.store";
import { SyncStatusLine } from "@web/calendars/SyncStatusLine";
import { AccountDisclosureHeading } from "./AccountDisclosureHeading";

/**
 * Heading for one connected account's calendars: the account email (also the
 * collapse toggle for its calendar rows, see CalendarList.tsx), that
 * account's own sync status, and its own reconnect/refresh action. Rendered
 * only when more than one account is connected - with a single account the
 * calendar list heading already carries all of this. Adding/disconnecting
 * accounts lives in the command palette's "Add account" / "Show accounts"
 * items - not a permanent row or icon here, which stayed noisy for accounts
 * with many subcalendars.
 */
export const AccountSectionHeader: FC<{
  accountEmail: string;
  connection: GoogleSyncConnectionSummary | undefined;
}> = ({ accountEmail, connection }) => {
  const { commandAction, isAvailable, isConnecting, isRefreshing, state } =
    useConnectGoogle({ connection });
  const syncStatus = getGoogleSyncStatus(state, connection);
  const isSyncing = syncStatus?.variant === "syncing";
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
      <AccountDisclosureHeading
        as="h3"
        caretSize={10}
        className="mb-0.5 text-xs"
        collapseKey={accountEmail}
        email={accountEmail}
        isCollapsed={isCollapsed}
        isSyncing={isSyncing}
      />
      <SyncStatusLine
        status={syncStatus?.variant === "healthy" ? null : syncStatus}
      />
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
