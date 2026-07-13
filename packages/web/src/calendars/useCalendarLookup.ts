import { useMemo } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { useCalendarsQuery } from "@web/calendars/calendar.query";

const EMPTY_CALENDAR_LOOKUP: ReadonlyMap<CalendarId, Calendar> = new Map();

/**
 * Pure id -> Calendar map builder, factored out of {@link useCalendarLookup}
 * so a non-hook call site (useEventMutations.ts's read-only backstop, which
 * reads the query cache directly via `queryClient.getQueryData` rather than
 * `useCalendarsQuery`/`useSession` as hooks - see that file's comment) can
 * build the same lookup shape without adding a new hook dependency.
 */
export function buildCalendarLookup(
  calendars: Calendar[] | undefined,
): ReadonlyMap<CalendarId, Calendar> {
  if (!calendars) return EMPTY_CALENDAR_LOOKUP;
  return new Map(calendars.map((calendar) => [calendar.id, calendar]));
}

/**
 * Memoized id -> Calendar lookup, built once per calendars-query data
 * reference rather than rescanned per event/card render (packet 08 step 5).
 * Call this once in a list-rendering parent (e.g. MainGridEvents,
 * AllDayEvents) and resolve/pass down per-card via
 * {@link resolveCalendarCardIdentity} - not from inside every card.
 */
export function useCalendarLookup(): ReadonlyMap<CalendarId, Calendar> {
  const { data } = useCalendarsQuery();

  return useMemo(() => buildCalendarLookup(data), [data]);
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

/**
 * An event is read-only (inspectable but never mutable) when either:
 * - it's a busy event (content.kind === "busy") - a private event on a
 *   reader calendar whose real fields the server never sends, so there is
 *   nothing that could round-trip through an edit; forced read-only
 *   regardless of calendar capability (packet 08 step 8), or
 * - its calendar resolves in the lookup and that calendar's
 *   capabilities.canWrite is false.
 *
 * A calendarId that doesn't resolve in the lookup (missing/stale/not yet
 * loaded) fails OPEN as writable - a lookup gap must not lock a user out of
 * their own event. The backend still enforces the real capability on every
 * write, so failing open here only ever costs a rejected request, never a
 * silent bypass.
 */
export function isEventReadOnly(
  lookup: ReadonlyMap<CalendarId, Calendar>,
  calendarId: CalendarId | null | undefined,
  isBusy: boolean,
): boolean {
  if (isBusy) return true;
  if (!calendarId) return false;

  const calendar = lookup.get(calendarId);
  if (!calendar) return false;

  return !calendar.capabilities.canWrite;
}
