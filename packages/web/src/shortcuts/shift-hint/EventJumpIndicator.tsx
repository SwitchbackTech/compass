import { type FC } from "react";
import {
  selectEventJumpActive,
  selectEventJumpAnnouncement,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";

/**
 * Persistent badge + live region while event-jump mode is on.
 */
export const EventJumpIndicator: FC = () => {
  const isActive = useEventJumpStore(selectEventJumpActive);
  const announcement = useEventJumpStore(selectEventJumpAnnouncement);

  if (!isActive && !announcement) return null;

  return (
    <span
      aria-live="polite"
      className="truncate text-text-muted text-xs opacity-80"
      data-event-jump-indicator=""
      role="status"
    >
      {isActive
        ? announcement && announcement !== "Event jump on"
          ? `Jump · ${announcement} · Esc`
          : "Event jump · Esc or Shift"
        : announcement}
    </span>
  );
};
