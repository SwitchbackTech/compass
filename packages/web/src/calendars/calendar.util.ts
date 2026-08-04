import { type Calendar } from "@core/types/calendar.contracts";

export function getLocalCalendar(calendars: Calendar[]): Calendar | undefined {
  return calendars.find((calendar) => calendar.provider === "local");
}

export interface DefaultTargetCalendarOptions {
  /**
   * The calendar the user starred as their default. Ignored when it names a
   * calendar that is gone or no longer writable, so a stale preference
   * degrades to the derived default instead of breaking event creation.
   */
  preferredCalendarId?: string | null;
  /**
   * Connected account emails in connection order. With two accounts, both
   * have a primary calendar, so "first primary wins" would pick whichever
   * happened to sort first; this makes the oldest-connected account win.
   */
  accountEmailOrder?: readonly string[];
}

const isWritableGoogleCalendar = (calendar: Calendar): boolean =>
  calendar.provider === "google" && calendar.capabilities.canWrite;

/**
 * Where a new event lands: the user's starred default if it is still usable,
 * else the primary calendar of the oldest-connected account, else the local
 * calendar (offline/anonymous mode, or a Google account with no primary the
 * user can write to).
 */
export function getDefaultTargetCalendar(
  calendars: Calendar[],
  options: DefaultTargetCalendarOptions = {},
): Calendar | undefined {
  const { preferredCalendarId, accountEmailOrder = [] } = options;

  const preferred = preferredCalendarId
    ? calendars.find((calendar) => calendar.id === preferredCalendarId)
    : undefined;
  // The local calendar is a valid explicit choice even though it is not a
  // writable *Google* calendar.
  if (preferred?.capabilities.canWrite) {
    return preferred;
  }

  const primaries = calendars.filter(
    (calendar) => calendar.isPrimary && isWritableGoogleCalendar(calendar),
  );
  const byConnectionOrder = accountEmailOrder
    .map((email) =>
      primaries.find((calendar) => calendar.accountEmail === email),
    )
    .find(Boolean);

  return byConnectionOrder ?? primaries[0] ?? getLocalCalendar(calendars);
}
