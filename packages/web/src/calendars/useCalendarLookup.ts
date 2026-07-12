import { useMemo } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { useCalendarsQuery } from "@web/calendars/calendar.query";

const EMPTY_CALENDAR_LOOKUP: ReadonlyMap<CalendarId, Calendar> = new Map();

/**
 * Memoized id -> Calendar lookup, built once per calendars-query data
 * reference rather than rescanned per event/card render (packet 08 step 5).
 * Call this once in a list-rendering parent (e.g. MainGridEvents,
 * AllDayEvents, SomedayEventsContainer) and resolve/pass down per-card via
 * {@link resolveCalendarCardIdentity} - not from inside every card.
 */
export function useCalendarLookup(): ReadonlyMap<CalendarId, Calendar> {
  const { data } = useCalendarsQuery();

  return useMemo(() => {
    if (!data) return EMPTY_CALENDAR_LOOKUP;
    return new Map(data.map((calendar) => [calendar.id, calendar]));
  }, [data]);
}

export type CalendarCardIdentity = {
  name: string;
  backgroundColor: string;
};

/**
 * Resolves the calendar-colored accent + accessible-label suffix for a
 * single event card. Identity is never conveyed by color alone (A9): the
 * name always travels with the accent. Gated on there being more than one
 * active calendar - a single-calendar account's cards gain nothing from
 * either the accent or a redundant name suffix, since every card would say
 * the same thing.
 */
export function resolveCalendarCardIdentity(
  lookup: ReadonlyMap<CalendarId, Calendar>,
  calendarId: CalendarId | null | undefined,
): CalendarCardIdentity | null {
  if (!calendarId || lookup.size <= 1) return null;

  const calendar = lookup.get(calendarId);
  return calendar
    ? { name: calendar.name, backgroundColor: calendar.backgroundColor }
    : null;
}
