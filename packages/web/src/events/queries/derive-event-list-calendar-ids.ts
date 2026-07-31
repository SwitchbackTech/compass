import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";

/**
 * Calendar ids worth sending on event list reads: active + currently visible.
 * Exported so week/day query builders and tests share one derivation.
 * When calendars have not loaded yet, returns undefined so the backend keeps
 * the legacy "all calendars" read (fail-open) until visibility is known.
 */
export function deriveEventListCalendarIds(
  calendars: Calendar[] | undefined,
): CalendarId[] | undefined {
  if (calendars === undefined) return undefined;

  return calendars
    .filter((calendar) => calendar.isActive && calendar.isVisible)
    .map((calendar) => calendar.id);
}
