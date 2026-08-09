import { type Calendar } from "@core/types/calendar.contracts";

export interface GetDayViewCalendarsOptions {
  /**
   * True once any account is connected. Mirrors the sidebar (LCV3): the local
   * Compass calendar then drops out of day-view columns so connected users do
   * not see an orphan empty column they can no longer toggle in the list.
   * Derive from connection state (e.g. useConnectedAccountEmails().length > 0),
   * never from calendar rows alone.
   */
  hasConnectedAccount?: boolean;
}

export const getDayViewCalendars = (
  calendars: Calendar[],
  options: GetDayViewCalendarsOptions = {},
): Calendar[] => {
  const { hasConnectedAccount = false } = options;
  const eligibleCalendars = calendars.filter(
    (calendar) =>
      (!hasConnectedAccount || calendar.provider !== "local") &&
      calendar.isActive &&
      calendar.isVisible,
  );

  if (eligibleCalendars.length > 0) {
    return eligibleCalendars;
  }

  const fallbackCalendars = hasConnectedAccount
    ? calendars.filter((calendar) => calendar.provider !== "local")
    : calendars;
  const primaryCalendar = fallbackCalendars.find(
    (calendar) => calendar.isPrimary,
  );
  return primaryCalendar ? [primaryCalendar] : fallbackCalendars.slice(0, 1);
};
