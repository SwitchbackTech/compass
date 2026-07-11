import { type Calendar } from "@core/types/calendar.contracts";

// A4: the default create target is the primary writable Google calendar,
// falling back to the local calendar when there is no such Google calendar
// (offline/anonymous mode, or a Google account with no primary writer access).
export function getLocalCalendar(calendars: Calendar[]): Calendar | undefined {
  return calendars.find((calendar) => calendar.provider === "local");
}

export function getDefaultTargetCalendar(
  calendars: Calendar[],
): Calendar | undefined {
  const primaryGoogle = calendars.find(
    (calendar) =>
      calendar.provider === "google" &&
      calendar.isPrimary &&
      calendar.capabilities.canWrite,
  );

  return primaryGoogle ?? getLocalCalendar(calendars);
}
