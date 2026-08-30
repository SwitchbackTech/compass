import {
  type AdminPutBookingPageInput,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { getWritableCalendars } from "@web/calendars/calendar.util";

export const BOOKING_PLACEHOLDER_CALENDAR_ID =
  "000000000000000000000001" as CalendarId;

export function getAvailabilityReadableCalendars(
  calendars: Calendar[],
): Calendar[] {
  return calendars.filter(
    (calendar) =>
      calendar.isActive && calendar.capabilities.canReadAvailability,
  );
}

export function defaultBlockingCalendarIdsForDestination(
  destinationCalendarId: CalendarId,
  calendars: Calendar[],
): CalendarId[] {
  const destination = calendars.find(
    (calendar) => calendar.id === destinationCalendarId,
  );
  if (!destination?.accountEmail) {
    return [destinationCalendarId];
  }
  const accountEmail = destination.accountEmail.toLowerCase();
  const onAccount = getAvailabilityReadableCalendars(calendars).filter(
    (calendar) => calendar.accountEmail?.toLowerCase() === accountEmail,
  );
  return onAccount.length > 0
    ? onAccount.map((calendar) => calendar.id)
    : [destinationCalendarId];
}

export function isPlaceholderDestinationCalendar(
  calendarId: CalendarId,
): boolean {
  return calendarId === BOOKING_PLACEHOLDER_CALENDAR_ID;
}

export function canEnableBookingPage(
  input: AdminPutBookingPageInput,
  writableCalendars: Calendar[],
): boolean {
  if (isPlaceholderDestinationCalendar(input.destinationCalendarId)) {
    return false;
  }
  return writableCalendars.some(
    (calendar) => calendar.id === input.destinationCalendarId,
  );
}

export function resolveWritableCalendars(
  calendars: Calendar[],
  hasConnectedAccount: boolean,
): Calendar[] {
  return getWritableCalendars(calendars, { hasConnectedAccount });
}

const WEEKDAY_LABELS: Record<WeeklyAvailabilityInterval["weekday"], string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function weekdayLabel(weekday: WeeklyAvailabilityInterval["weekday"]) {
  return WEEKDAY_LABELS[weekday];
}

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
