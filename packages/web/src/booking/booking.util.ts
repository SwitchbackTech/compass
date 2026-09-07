import {
  type AdminGetBookingPageResult,
  type AdminPutBookingPageInput,
  BookingSlugSchema,
  pickAdminPutBookingPageInput,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type BookingSequenceField } from "@web/booking/booking-sequence.fields";
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
  return pickAdminPutBookingPageInput(page);
}

/**
 * Compare the live Settings form against the last seeded page. Number fields
 * keep raw text until parse succeeds, so an in-progress (or cleared) value
 * counts as dirty even when `form.minNoticeHours` / `form.maxHorizonDays`
 * still hold the previous integer.
 */
export function isBookingSettingsFormDirty({
  form,
  baseline,
  minNoticeText,
  horizonText,
}: {
  form: AdminPutBookingPageInput;
  baseline: AdminPutBookingPageInput;
  minNoticeText: string;
  horizonText: string;
}): boolean {
  if (
    JSON.stringify(toBookingPageInput(form)) !==
    JSON.stringify(toBookingPageInput(baseline))
  ) {
    return true;
  }
  return (
    minNoticeText !== String(baseline.minNoticeHours) ||
    horizonText !== String(baseline.maxHorizonDays)
  );
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

export const WELCOME_TEXT_MAX_LENGTH = 500;
export const WELCOME_TEXT_TOO_LONG_MESSAGE = `Welcome text must be ${WELCOME_TEXT_MAX_LENGTH} characters or fewer.`;

export const isWelcomeTextTooLong = (
  welcomeText: string | null | undefined,
): boolean => (welcomeText?.length ?? 0) > WELCOME_TEXT_MAX_LENGTH;

export type BookingFormValidationError = {
  message: string;
  field?: BookingSequenceField;
};

export function bookingSlugValidationError(
  slug: string | undefined,
): BookingFormValidationError | null {
  const result = BookingSlugSchema.safeParse(slug ?? "");
  if (result.success) {
    return null;
  }
  return {
    field: "address",
    message: result.error.issues[0]?.message ?? "Enter a valid page address.",
  };
}

export function resolveBookingFormSlug(
  page: AdminGetBookingPageResult | undefined,
): string | undefined {
  if (!page) {
    return undefined;
  }
  return "bookingUrl" in page ? page.slug : page.suggestedSlug;
}

export function validateBookingForm({
  areHoursValid,
  enabling,
  form,
  horizonInvalid,
  minNoticeInvalid,
  writableCalendars,
}: {
  areHoursValid: boolean;
  enabling: boolean;
  form: AdminPutBookingPageInput;
  horizonInvalid: boolean;
  minNoticeInvalid: boolean;
  writableCalendars: Calendar[];
}): BookingFormValidationError | null {
  const slugError = bookingSlugValidationError(form.slug);
  if (slugError) {
    return slugError;
  }
  if (!areHoursValid) {
    return {
      field: "hours",
      message: "Fix the weekly hours that could not be read.",
    };
  }
  if (isWelcomeTextTooLong(form.welcomeText)) {
    return { field: "welcome", message: WELCOME_TEXT_TOO_LONG_MESSAGE };
  }
  if (minNoticeInvalid) {
    return {
      field: "notice",
      message: "Fix the highlighted number fields before saving.",
    };
  }
  if (horizonInvalid) {
    return {
      field: "horizon",
      message: "Fix the highlighted number fields before saving.",
    };
  }
  if (enabling && !canEnableBookingPage(form, writableCalendars)) {
    return {
      field: "destination",
      message: "Choose a destination calendar before enabling booking.",
    };
  }
  if (enabling && form.blockingCalendarIds.length === 0) {
    return {
      field: "blocking",
      message: "Select at least one blocking calendar.",
    };
  }
  if (enabling && form.weeklyAvailability.length === 0) {
    return {
      field: "hours",
      message: "Add weekly hours before turning on your booking page.",
    };
  }
  return null;
}
