import { type FC, useEffect } from "react";
import {
  eventJumpActions,
  selectEventJumpActive,
  selectEventJumpAnnouncement,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";

const EXIT_ANNOUNCEMENT_LINGER_MS = 1200;

/**
 * Persistent badge + live region while event-jump mode is on. Stays mounted
 * briefly after exit so "Event jump off" can be spoken.
 */
export const EventJumpIndicator: FC = () => {
  const isActive = useEventJumpStore(selectEventJumpActive);
  const announcement = useEventJumpStore(selectEventJumpAnnouncement);

  useEffect(() => {
    if (isActive || announcement !== "Event jump off") return;
    const timer = window.setTimeout(() => {
      if (useEventJumpStore.getState().announcement === "Event jump off") {
        eventJumpActions.clearAnnouncement();
      }
    }, EXIT_ANNOUNCEMENT_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [isActive, announcement]);

  if (!isActive && !announcement) return null;

  const statusText = !isActive
    ? announcement
    : announcement && announcement !== "Event jump on"
      ? `Jump · ${announcement} · Esc`
      : "Event jump · Esc or Shift";

  return (
    <span
      aria-live="polite"
      className="truncate text-text-muted text-xs opacity-80"
      data-event-jump-indicator=""
      role="status"
    >
      {statusText}
    </span>
  );
};
