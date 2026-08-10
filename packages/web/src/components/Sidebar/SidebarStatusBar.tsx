import { type FC } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  getSidebarSyncStatus,
  SSE_DEGRADED_STATUS,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useGoogleSyncRefreshSnapshot } from "@web/auth/google/state/google.sync.refresh";
import { SYNC_STATUS_VARIANT_CLASSNAME } from "@web/calendars/sync-status.types";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";
import { EdgeFocusIndicator } from "@web/grid/shortcuts/EdgeFocusIndicator";
import {
  selectEdgeFocusActive,
  selectEdgeFocusAnnouncement,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import { settingsActions } from "@web/settings/settings.store";
import { KeyboardOnlyIndicator } from "@web/shortcuts/keyboard-only/KeyboardOnlyIndicator";
import {
  selectKeyboardOnlyActive,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { EventJumpIndicator } from "@web/shortcuts/shift-hint/EventJumpIndicator";
import {
  selectEventJumpActive,
  selectEventJumpAnnouncement,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { useSseDegraded } from "@web/sse/hooks/useSseDegraded";

/**
 * Pinned status bar at the bottom of the sidebar, just above the actions bar.
 * Always occupies a fixed height so nothing in the sidebar can shift when a
 * mutation goes in/out of flight, or an account's Google sync status changes -
 * that status used to render inline under each account's heading, where it
 * pushed the calendar rows below it up and down as accounts synced.
 *
 * The whole bar is a button that opens Settings > Accounts, where the full
 * sentence fits. Sidebar copy stays short so the fixed h-6 never truncates
 * the meaning; `title` is the safety net if anything still overflows.
 */
export const SidebarStatusBar: FC = () => {
  const isKeyboardOnly = useKeyboardOnlyStore(selectKeyboardOnlyActive);
  const isEventJump = useEventJumpStore(selectEventJumpActive);
  const eventJumpAnnouncement = useEventJumpStore(selectEventJumpAnnouncement);
  const showEventJump = isEventJump || Boolean(eventJumpAnnouncement);
  const isEdgeFocus = useEdgeFocusStore(selectEdgeFocusActive);
  const edgeFocusAnnouncement = useEdgeFocusStore(selectEdgeFocusAnnouncement);
  const showEdgeFocus = isEdgeFocus || Boolean(edgeFocusAnnouncement);
  const isSaving = useHasPendingEventMutations();
  // The unscoped hook's `connection` is the primary connection (the one
  // whose own state matches the aggregate) - without it, an account's
  // routine incremental catch-up looks identical to a brand-new import: both
  // collapse to the aggregate "IMPORTING" state, and only the connection's
  // own lastHealthyAt tells getSidebarSyncStatus the account was already
  // established and should stay quiet.
  const { connection, isConnecting, state } = useConnectGoogle();
  const refreshSnapshot = useGoogleSyncRefreshSnapshot();
  const sseDegraded = useSseDegraded();
  const syncStatus = getSidebarSyncStatus({
    connection,
    isConnecting,
    state,
    refreshGaveUp: refreshSnapshot.gaveUp,
    refreshInFlight: refreshSnapshot.isRefreshing,
  });
  // sseDegraded only fills in when sync itself has nothing to say (a silent
  // "healthy" null) - a real reconnect/attention/importing status is always
  // more useful and must not be preempted by the live-updates warning.
  const status = isSaving
    ? { variant: "syncing" as const, text: "Saving changes…" }
    : (syncStatus ?? (sseDegraded ? SSE_DEGRADED_STATUS : null));

  const text = status?.text ?? "";

  return (
    <div className="flex h-6 shrink-0 items-center px-4">
      {isKeyboardOnly ? (
        <div className="flex h-full min-w-0 flex-1 items-center">
          <KeyboardOnlyIndicator />
        </div>
      ) : showEventJump ? (
        <div className="flex h-full min-w-0 flex-1 items-center">
          <EventJumpIndicator />
        </div>
      ) : showEdgeFocus ? (
        <div className="flex h-full min-w-0 flex-1 items-center">
          <EdgeFocusIndicator />
        </div>
      ) : (
        <button
          aria-label={
            text ? `${text}. Open account settings` : "Open account settings"
          }
          className="c-focus-ring flex h-full min-w-0 flex-1 items-center rounded-xs text-left"
          onClick={settingsActions.openSettings}
          title={text || undefined}
          type="button"
        >
          <span
            aria-live="polite"
            className={`truncate text-xs ${status ? SYNC_STATUS_VARIANT_CLASSNAME[status.variant] : ""}`}
            role="status"
          >
            {text}
          </span>
        </button>
      )}
    </div>
  );
};
