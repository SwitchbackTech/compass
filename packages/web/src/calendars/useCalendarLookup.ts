import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { isCalendarReconnectRequired } from "@web/auth/google/state/google.reconnect.calendar";
import { useGoogleReconnectRequiredVersion } from "@web/auth/google/state/google.reconnect.state";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { type CrossAccountDuplicate } from "@web/common/types/web.event.types";

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

// Keyed on the calendars-query data reference, shared across every
// useCalendarLookup() call site rather than a per-component useMemo: with
// useCalendarsQuery's result now cached per (hiddenIds, data) (see
// calendar.query.ts), every consumer in a render tree gets back the same
// `data` reference, so a per-component useMemo would still rebuild the same
// map once per consumer instead of once total.
const lookupCache = new WeakMap<
  Calendar[],
  ReadonlyMap<CalendarId, Calendar>
>();

function getCalendarLookup(
  data: Calendar[] | undefined,
): ReadonlyMap<CalendarId, Calendar> {
  if (!data) return EMPTY_CALENDAR_LOOKUP;

  let lookup = lookupCache.get(data);
  if (!lookup) {
    lookup = buildCalendarLookup(data);
    lookupCache.set(data, lookup);
  }
  return lookup;
}

/**
 * Memoized id -> Calendar lookup, built once per calendars-query data
 * reference rather than rescanned per event/card render.
 * Call this once in a list-rendering parent (e.g. MainGridEvents,
 * AllDayEvents) and resolve/pass down per-card via
 * {@link resolveCalendarCardIdentity} - not from inside every card.
 */
export function useCalendarLookup(): ReadonlyMap<CalendarId, Calendar> {
  const { data } = useCalendarsQuery();
  // Re-render grid/form consumers when a session reconnect override flips so
  // isEventReadOnly starts treating that account's events as read-only.
  useGoogleReconnectRequiredVersion();

  return getCalendarLookup(data);
}

export type CalendarCardIdentity = {
  name: string;
  backgroundColor: string;
  /**
   * Set when this card is standing in for a meeting that also exists on
   * another connected account (the event's own `otherAccount`, joined by the
   * view model). The card paints a two-color gradient accent from it and
   * names the account in its label - the merge is otherwise invisible (A5),
   * so this is the only surviving signal that a second copy exists.
   */
  otherAccount?: CrossAccountDuplicate;
};

/**
 * Resolves the calendar-colored accent + accessible-label suffix for a
 * single event card. Identity is never conveyed by color alone: the
 * name always travels with the accent. Gated on there being more than one
 * active calendar - a single-calendar account's cards gain nothing from
 * either the accent or a redundant name suffix, since every card would say
 * the same thing.
 *
 * Takes the event rather than a calendar id plus its `otherAccount`, which
 * every call site was reading off the same object anyway - and matches
 * {@link isGridEventInteractionReadOnly}, its neighbor at those call sites.
 */
export function resolveCalendarCardIdentity(
  lookup: ReadonlyMap<CalendarId, Calendar>,
  event: {
    calendarId?: CalendarId | null;
    otherAccount?: CrossAccountDuplicate;
  },
): CalendarCardIdentity | null {
  const { calendarId, otherAccount } = event;
  if (!calendarId || lookup.size <= 1) return null;

  const calendar = lookup.get(calendarId);
  if (!calendar) return null;

  return {
    name: calendar.name,
    backgroundColor: calendar.backgroundColor,
    ...(otherAccount ? { otherAccount } : {}),
  };
}

/**
 * Grid-only content flags that force read-only treatment regardless of
 * calendar write capability (passed as the `isBusy` argument to
 * {@link isEventReadOnly}). isSandboxReadOnly covers ephemeral onboarding
 * sandbox events (see OnboardingTour/onboarding.sandbox-events.ts), which
 * have nothing real for a write to persist to.
 */
export const isGridEventContentReadOnly = (event: {
  isBusy?: boolean;
  isTimedMultiDayDisplay?: boolean;
  isSandboxReadOnly?: boolean;
}): boolean =>
  (event.isBusy ?? false) ||
  (event.isTimedMultiDayDisplay ?? false) ||
  (event.isSandboxReadOnly ?? false);

/**
 * An event is read-only (inspectable but never mutable) when either:
 * - it's a busy event (content.kind === "busy") - a private event on a
 *   reader calendar whose real fields the server never sends, so there is
 *   nothing that could round-trip through an edit; forced read-only
 *   regardless of calendar capability, or
 * - its calendar belongs to a Google account that needs reconnect, or
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

  if (isCalendarReconnectRequired(calendar)) {
    return true;
  }

  return !calendar.capabilities.canWrite;
}

/**
 * Single read-only predicate for grid card registration and edit shortcuts
 * (delete / nudge). Uses {@link isGridEventContentReadOnly} so busy content
 * and timed multi-day display bars cannot diverge between pointer and
 * keyboard gates.
 */
export function isGridEventInteractionReadOnly(
  lookup: ReadonlyMap<CalendarId, Calendar>,
  event: {
    calendarId?: CalendarId | null;
    isBusy?: boolean;
    isTimedMultiDayDisplay?: boolean;
    isSandboxReadOnly?: boolean;
  },
): boolean {
  return isEventReadOnly(
    lookup,
    event.calendarId,
    isGridEventContentReadOnly(event),
  );
}
