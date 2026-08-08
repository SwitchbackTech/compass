import { type FC } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getSidebarSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useGoogleSyncRefreshSnapshot } from "@web/auth/google/state/google.sync.refresh";
import { SYNC_STATUS_VARIANT_CLASSNAME } from "@web/calendars/sync-status.types";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";
import { settingsActions } from "@web/settings/settings.store";
import { KeyboardOnlyIndicator } from "@web/shortcuts/keyboard-only/KeyboardOnlyIndicator";
import {
  selectKeyboardOnlyActive,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { EventJumpIndicator } from "@web/shortcuts/shift-hint/EventJumpIndicator";
import {
  selectEventJumpActive,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";

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
  const isSaving = useHasPendingEventMutations();
  // The unscoped hook's `connection` is the primary connection (the one
  // whose own state matches the aggregate) - without it, an account's
  // routine incremental catch-up looks identical to a brand-new import: both
  // collapse to the aggregate "IMPORTING" state, and only the connection's
  // own lastHealthyAt tells getSidebarSyncStatus the account was already
  // established and should stay quiet.
  const { connection, isConnecting, state } = useConnectGoogle();
  const refreshSnapshot = useGoogleSyncRefreshSnapshot();
  const status = isSaving
    ? { variant: "syncing" as const, text: "Saving changes…" }
    : getSidebarSyncStatus({
        connection,
        isConnecting,
        state,
        refreshGaveUp: refreshSnapshot.gaveUp,
        refreshInFlight: refreshSnapshot.isRefreshing,
      });

  const text = status?.text ?? "";

  return (
    <div className="flex h-6 shrink-0 items-center px-4">
      {isKeyboardOnly ? (
        <div className="flex h-full min-w-0 flex-1 items-center">
          <KeyboardOnlyIndicator />
        </div>
      ) : isEventJump ? (
        <div className="flex h-full min-w-0 flex-1 items-center">
          <EventJumpIndicator />
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
