import { type Calendar } from "@core/types/calendar.contracts";
import { readHiddenCalendarIds } from "./calendar-visibility.storage";

// Overlay client-owned visibility onto a server calendar list. Server
// isVisible is ignored: under sync delegation it is always true, and under
// legacy the Mongo field is no longer written by the web toggle (A2).
export function applyClientVisibility(calendars: Calendar[]): Calendar[] {
  const hidden = readHiddenCalendarIds();
  return calendars.map((calendar) => ({
    ...calendar,
    isVisible: !hidden.has(calendar.id),
  }));
}
