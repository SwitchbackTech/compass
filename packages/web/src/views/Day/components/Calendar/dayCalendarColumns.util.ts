import { type Calendar } from "@core/types/calendar.contracts";

export const getDayViewCalendars = (calendars: Calendar[]): Calendar[] => {
  const enabledCalendars = calendars.filter(
    (calendar) => calendar.isActive && calendar.isVisible,
  );

  if (enabledCalendars.length > 0) {
    return enabledCalendars;
  }

  const primaryCalendar = calendars.find((calendar) => calendar.isPrimary);
  return primaryCalendar ? [primaryCalendar] : calendars.slice(0, 1);
};
