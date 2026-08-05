import { type FC } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getSidebarSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import {
  selectPrimaryGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
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
  const { isConnecting, state } = useConnectGoogle();
  // The primary connection (the one whose own state matches the aggregate) -
  // without it, an account's routine incremental catch-up looks identical to
  // a brand-new import: both collapse to the aggregate "IMPORTING" state, and
  // only the connection's own lastHealthyAt tells getSidebarSyncStatus the
  // account was already established and should stay quiet.
  const primaryConnection = useUserMetadataStore(
    selectPrimaryGoogleSyncConnection,
  );
  const googleStatus = getSidebarSyncStatus({
    connection: primaryConnection,
    isConnecting,
    state,
  });

  const text = isSaving ? "Saving changes…" : (googleStatus?.text ?? "");
  const variantClassName = isSaving
    ? SYNC_STATUS_VARIANT_CLASSNAME.syncing
    : googleStatus
      ? SYNC_STATUS_VARIANT_CLASSNAME[googleStatus.variant]
      : "";

  return (
    <div className="flex h-6 shrink-0 items-center border-border border-t px-4">
      <p
        aria-live="polite"
        className={`truncate text-xs ${variantClassName}`}
        role="status"
      >
        {text}
      </p>
    </div>
  );
};
