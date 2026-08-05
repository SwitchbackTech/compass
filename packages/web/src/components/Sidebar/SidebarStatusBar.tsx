import { type FC } from "react";
import { SYNC_STATUS_VARIANT_CLASSNAME } from "@web/calendars/sync-status.types";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";

/**
 * Pinned status bar at the bottom of the sidebar, just above the actions bar.
 * Always occupies a fixed height so nothing in the sidebar can shift when
 * a mutation goes in/out of flight.
 */
export const SidebarStatusBar: FC = () => {
  const isSaving = useHasPendingEventMutations();

  return (
    <div className="flex h-6 shrink-0 items-center border-border border-t px-4">
      <p
        aria-live="polite"
        className={`truncate text-xs ${isSaving ? SYNC_STATUS_VARIANT_CLASSNAME.syncing : ""}`}
        role="status"
      >
        {isSaving ? "Saving changes…" : ""}
      </p>
    </div>
  );
};
