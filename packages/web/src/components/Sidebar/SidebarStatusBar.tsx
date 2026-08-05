import { type FC } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getSidebarSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { SYNC_STATUS_VARIANT_CLASSNAME } from "@web/calendars/sync-status.types";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";

/**
 * Pinned status bar at the bottom of the sidebar, just above the actions bar.
 * Always occupies a fixed height so nothing in the sidebar can shift when a
 * mutation goes in/out of flight, or an account's Google sync status changes -
 * that status used to render inline under each account's heading, where it
 * pushed the calendar rows below it up and down as accounts synced.
 */
export const SidebarStatusBar: FC = () => {
  const isSaving = useHasPendingEventMutations();
  // The unscoped hook's `connection` is the primary connection (the one
  // whose own state matches the aggregate) - without it, an account's
  // routine incremental catch-up looks identical to a brand-new import: both
  // collapse to the aggregate "IMPORTING" state, and only the connection's
  // own lastHealthyAt tells getSidebarSyncStatus the account was already
  // established and should stay quiet.
  const { connection, isConnecting, state } = useConnectGoogle();
  const status = isSaving
    ? { variant: "syncing" as const, text: "Saving changes…" }
    : getSidebarSyncStatus({ connection, isConnecting, state });

  return (
    <div className="flex h-6 shrink-0 items-center border-border border-t px-4">
      <p
        aria-live="polite"
        className={`truncate text-xs ${status ? SYNC_STATUS_VARIANT_CLASSNAME[status.variant] : ""}`}
        role="status"
      >
        {status?.text ?? ""}
      </p>
    </div>
  );
};
