import {
  type AdminGetBookingPageResult,
  type AdminPutBookingPageInput,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import {
  getLocalCalendar,
  getWritableCalendars,
} from "@web/calendars/calendar.util";

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
  const readable = getAvailabilityReadableCalendars(calendars);
  const destination = calendars.find(
    (calendar) => calendar.id === destinationCalendarId,
  );
  const accountEmail = destination?.accountEmail;
  const ids: CalendarId[] =
    accountEmail === undefined
      ? [destinationCalendarId]
      : readable
          .filter(
            (calendar) =>
              calendar.accountEmail?.toLowerCase() ===
              accountEmail.toLowerCase(),
          )
          .map((calendar) => calendar.id);
  const blockingIds = ids.length > 0 ? ids : [destinationCalendarId];
  const local = getLocalCalendar(readable);
  if (local && !blockingIds.includes(local.id)) {
    blockingIds.push(local.id);
  }
  return blockingIds;
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

/**
 * The PUT body, and only the PUT body.
 *
 * `GET /booking/page` answers with the saved page once a slug exists, which
 * carries `id`, `slug`, `hostUserId`, `createdAt`, `updatedAt` and
 * `bookingUrl` on top of the input fields. `AdminPutBookingPageInputSchema` is
 * a `z.strictObject`, so spreading that response into form state made every
 * save after the first throw on the unknown keys before any request went out.
 * Pick the fields explicitly so a response-only key can never ride along.
 */
export function toBookingPageInput(
  page: Omit<AdminPutBookingPageInput, "welcomeText"> & {
    welcomeText?: AdminPutBookingPageInput["welcomeText"];
  },
): AdminPutBookingPageInput {
  return {
    enabled: page.enabled,
    durationMinutes: page.durationMinutes,
    destinationCalendarId: page.destinationCalendarId,
    blockingCalendarIds: page.blockingCalendarIds,
    timeZone: page.timeZone,
    weeklyAvailability: page.weeklyAvailability,
    welcomeText: page.welcomeText ?? null,
    minNoticeHours: page.minNoticeHours,
    maxHorizonDays: page.maxHorizonDays,
    bufferMinutes: page.bufferMinutes,
    maxBookingsPerDay: page.maxBookingsPerDay,
    guestsCanInviteOthers: page.guestsCanInviteOthers,
  };
}

/**
 * A page the host has never saved. `GET /booking/page` answers with the same
 * bare input shape whether the host never saved or saved without ever
 * enabling, so the explicit flag is the only way to tell them apart - and the
 * difference decides whether the client may overwrite the timezone.
 */
export function isUnconfiguredBookingPage(
  page: AdminGetBookingPageResult,
): boolean {
  return "isConfigured" in page && page.isConfigured === false;
}
