import { z } from "zod/v4";
import {
  CalendarIdSchema,
  DateTimeSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { ObjectIdStringSchema } from "@core/types/type.utils";

export const BOOKING_RESERVED_SLUGS = [
  "week",
  "day",
  "life",
  "auth",
  "api",
  "cleanup",
  "book",
  "cancel",
  "reschedule",
  "confirmed",
  "p",
  "settings",
  "admin",
  "login",
  "logout",
  "signup",
  "invite",
  "calendar",
] as const;

export type BookingReservedSlug = (typeof BOOKING_RESERVED_SLUGS)[number];

export const BookingPageIdSchema =
  ObjectIdStringSchema.brand<"BookingPageId">();
export type BookingPageId = z.infer<typeof BookingPageIdSchema>;

export const BookingUserIdSchema =
  ObjectIdStringSchema.brand<"BookingUserId">();
export type BookingUserId = z.infer<typeof BookingUserIdSchema>;

export const BookingReservationIdSchema =
  ObjectIdStringSchema.brand<"BookingReservationId">();
export type BookingReservationId = z.infer<typeof BookingReservationIdSchema>;

export const BookingSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{3,32}$/, {
    message: "Slug must be 3-32 lowercase letters or digits",
  })
  .refine(
    (slug) => !BOOKING_RESERVED_SLUGS.includes(slug as BookingReservedSlug),
    { message: "Slug is reserved" },
  );
export type BookingSlug = z.infer<typeof BookingSlugSchema>;

export const BookingDurationMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);
export type BookingDurationMinutes = z.infer<
  typeof BookingDurationMinutesSchema
>;

const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const LocalTimeOfDaySchema = z
  .string()
  .trim()
  .regex(HH_MM_PATTERN, { message: 'Time must be "HH:mm" in 24-hour form' });
export type LocalTimeOfDay = z.infer<typeof LocalTimeOfDaySchema>;

/** "HH:mm" to minutes since local midnight. The one shared implementation. */
export const localTimeToMinutes = (time: string): number => {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  return hours * 60 + minutes;
};

export const IsoWeekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);
export type IsoWeekday = z.infer<typeof IsoWeekdaySchema>;

export const WeeklyAvailabilityIntervalSchema = z
  .strictObject({
    weekday: IsoWeekdaySchema,
    start: LocalTimeOfDaySchema,
    end: LocalTimeOfDaySchema,
  })
  .refine(
    ({ start, end }) => localTimeToMinutes(end) > localTimeToMinutes(start),
    { message: "Availability end must be after start", path: ["end"] },
  );
export type WeeklyAvailabilityInterval = z.infer<
  typeof WeeklyAvailabilityIntervalSchema
>;

const localTimeRangesOverlap = (
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean => {
  const aStart = localTimeToMinutes(a.start);
  const aEnd = localTimeToMinutes(a.end);
  const bStart = localTimeToMinutes(b.start);
  const bEnd = localTimeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
};

const intervalsOverlap = (
  a: WeeklyAvailabilityInterval,
  b: WeeklyAvailabilityInterval,
): boolean => a.weekday === b.weekday && localTimeRangesOverlap(a, b);

export const WeeklyAvailabilitySchema = z
  .array(WeeklyAvailabilityIntervalSchema)
  .readonly()
  .superRefine((intervals, ctx) => {
    for (let i = 0; i < intervals.length; i += 1) {
      const left = intervals[i];
      if (!left) {
        continue;
      }
      for (let j = i + 1; j < intervals.length; j += 1) {
        const right = intervals[j];
        if (!right) {
          continue;
        }
        if (intervalsOverlap(left, right)) {
          ctx.addIssue({
            code: "custom",
            message: "Weekly availability intervals must not overlap",
            path: [j],
          });
        }
      }
    }
  });
export type WeeklyAvailability = z.infer<typeof WeeklyAvailabilitySchema>;

export const BookingWelcomeTextSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((value) => (value === "" ? null : value));
export type BookingWelcomeText = z.infer<typeof BookingWelcomeTextSchema>;

export const BookingBufferMinutesSchema = z
  .int()
  .positive()
  .nullable()
  .default(null);
export type BookingBufferMinutes = z.infer<typeof BookingBufferMinutesSchema>;

export const BookingMaxBookingsPerDaySchema = z
  .int()
  .positive()
  .nullable()
  .default(null);
export type BookingMaxBookingsPerDay = z.infer<
  typeof BookingMaxBookingsPerDaySchema
>;

export const BookingPageSchema = z.strictObject({
  id: BookingPageIdSchema,
  slug: BookingSlugSchema,
  hostUserId: BookingUserIdSchema,
  enabled: z.boolean(),
  durationMinutes: BookingDurationMinutesSchema,
  destinationCalendarId: CalendarIdSchema,
  blockingCalendarIds: z.array(CalendarIdSchema).min(1).readonly(),
  timeZone: TimeZoneSchema,
  weeklyAvailability: WeeklyAvailabilitySchema,
  welcomeText: BookingWelcomeTextSchema.nullable().default(null),
  minNoticeHours: z.number().int().nonnegative().default(4),
  maxHorizonDays: z.number().int().positive().max(60).default(60),
  bufferMinutes: BookingBufferMinutesSchema,
  maxBookingsPerDay: BookingMaxBookingsPerDaySchema,
  guestsCanInviteOthers: z.boolean().default(true),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type BookingPage = z.infer<typeof BookingPageSchema>;

export const PublicBookingPageSchema = z.strictObject({
  hostDisplayName: z.string().trim().min(1).max(256),
  durationMinutes: BookingDurationMinutesSchema,
  timeZone: TimeZoneSchema,
  enabled: z.boolean(),
  maxHorizonDays: z.number().int().positive().max(60),
  welcomeText: BookingWelcomeTextSchema.nullable().default(null),
  createsGoogleMeet: z.boolean().default(true),
});
export type PublicBookingPage = z.infer<typeof PublicBookingPageSchema>;

export const toPublicBookingPage = (
  page: Pick<
    BookingPage,
    | "durationMinutes"
    | "timeZone"
    | "enabled"
    | "maxHorizonDays"
    | "welcomeText"
  >,
  hostDisplayName: string,
  createsGoogleMeet: boolean,
): PublicBookingPage =>
  PublicBookingPageSchema.parse({
    hostDisplayName,
    durationMinutes: page.durationMinutes,
    timeZone: page.timeZone,
    enabled: page.enabled,
    maxHorizonDays: page.maxHorizonDays,
    welcomeText: page.welcomeText ?? null,
    createsGoogleMeet,
  });

export const BookingReservationStatusSchema = z.enum([
  "confirmed",
  "cancelled",
]);
export type BookingReservationStatus = z.infer<
  typeof BookingReservationStatusSchema
>;

export const PublicGetBookingPageResponseSchema = PublicBookingPageSchema;
export type PublicGetBookingPageResponse = z.infer<
  typeof PublicGetBookingPageResponseSchema
>;

export const BookingSlotsQuerySchema = z.strictObject({
  start: DateTimeSchema,
  end: DateTimeSchema,
  timeZone: TimeZoneSchema,
});
export type BookingSlotsQuery = z.infer<typeof BookingSlotsQuerySchema>;

export const BookingSlotSchema = z.strictObject({
  slotStart: DateTimeSchema,
  slotEnd: DateTimeSchema,
});
export type BookingSlot = z.infer<typeof BookingSlotSchema>;

export const BookingSlotsResponseSchema = z.strictObject({
  slots: z.array(BookingSlotSchema).readonly(),
  bookable: z.boolean(),
});
export type BookingSlotsResponse = z.infer<typeof BookingSlotsResponseSchema>;

/** Same shape the guest form and public reservation service enforce. */
export const GUEST_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isGuestEmail = (email: string): boolean =>
  GUEST_EMAIL_PATTERN.test(email);

export const CreateBookingReservationInputSchema = z.strictObject({
  slotStart: DateTimeSchema,
  guestName: z.string().trim().min(1).max(256),
  guestEmail: z.string().trim().min(1).max(320),
  notes: z.string().trim().max(4000).optional(),
  guestTimeZone: TimeZoneSchema,
});
export type CreateBookingReservationInput = z.infer<
  typeof CreateBookingReservationInputSchema
>;

export const CreateBookingReservationResponseSchema = z.strictObject({
  reservationId: BookingReservationIdSchema,
  slotStart: DateTimeSchema,
  slotEnd: DateTimeSchema,
  guestTimeZone: TimeZoneSchema,
  cancelUrl: z.url(),
  rescheduleUrl: z.url(),
});
export type CreateBookingReservationResponse = z.infer<
  typeof CreateBookingReservationResponseSchema
>;

export const PublicGetBookingReservationResponseSchema = z.strictObject({
  slotStart: DateTimeSchema,
  guestTimeZone: TimeZoneSchema,
  durationMinutes: BookingDurationMinutesSchema,
  hostDisplayName: z.string().trim().min(1).max(256),
  status: BookingReservationStatusSchema,
  bookingSlug: BookingSlugSchema,
  guestName: z.string().trim().min(1).max(256),
  notes: z.string().trim().max(4000).nullable(),
  createsGoogleMeet: z.boolean().default(true),
});
export type PublicGetBookingReservationResponse = z.infer<
  typeof PublicGetBookingReservationResponseSchema
>;

export const PatchBookingReservationInputSchema = z
  .strictObject({
    token: z.string().trim().min(1).max(256),
    name: z.string().trim().min(1).max(256).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .refine((input) => input.name !== undefined || input.notes !== undefined, {
    message: "Provide name or notes",
  });
export type PatchBookingReservationInput = z.infer<
  typeof PatchBookingReservationInputSchema
>;

export const CancelBookingReservationInputSchema = z.strictObject({
  token: z.string().trim().min(1).max(256),
});
export type CancelBookingReservationInput = z.infer<
  typeof CancelBookingReservationInputSchema
>;

export const BookingReservationSlotsQuerySchema = z.strictObject({
  token: z.string().trim().min(1).max(256),
  start: DateTimeSchema,
  end: DateTimeSchema,
  timeZone: TimeZoneSchema,
});
export type BookingReservationSlotsQuery = z.infer<
  typeof BookingReservationSlotsQuerySchema
>;

export const RescheduleBookingReservationInputSchema = z.strictObject({
  token: z.string().trim().min(1).max(256),
  slotStart: DateTimeSchema,
  guestTimeZone: TimeZoneSchema,
});
export type RescheduleBookingReservationInput = z.infer<
  typeof RescheduleBookingReservationInputSchema
>;

export const RescheduleBookingReservationResponseSchema = z.strictObject({
  reservationId: BookingReservationIdSchema,
  slotStart: DateTimeSchema,
  slotEnd: DateTimeSchema,
  guestTimeZone: TimeZoneSchema,
  durationMinutes: BookingDurationMinutesSchema,
  hostDisplayName: z.string().trim().min(1).max(256),
  status: BookingReservationStatusSchema,
  bookingSlug: BookingSlugSchema,
});
export type RescheduleBookingReservationResponse = z.infer<
  typeof RescheduleBookingReservationResponseSchema
>;

export const AdminGetBookingPageResponseSchema = BookingPageSchema.extend({
  bookingUrl: z.url(),
});
export type AdminGetBookingPageResponse = z.infer<
  typeof AdminGetBookingPageResponseSchema
>;

export const AdminPutBookingPageInputSchema = z.strictObject({
  enabled: z.boolean(),
  durationMinutes: BookingDurationMinutesSchema,
  destinationCalendarId: CalendarIdSchema,
  blockingCalendarIds: z.array(CalendarIdSchema).min(1).readonly(),
  timeZone: TimeZoneSchema,
  weeklyAvailability: WeeklyAvailabilitySchema,
  welcomeText: BookingWelcomeTextSchema.nullable().default(null),
  minNoticeHours: z.number().int().nonnegative().default(4),
  maxHorizonDays: z.number().int().positive().max(60).default(60),
  bufferMinutes: BookingBufferMinutesSchema,
  maxBookingsPerDay: BookingMaxBookingsPerDaySchema,
  guestsCanInviteOthers: z.boolean().default(true),
});
export type AdminPutBookingPageInput = z.infer<
  typeof AdminPutBookingPageInputSchema
>;

/**
 * The PUT body, and only the PUT body. GET responses carry extra keys
 * (`id`, `slug`, `bookingUrl`, …) that `AdminPutBookingPageInputSchema`
 * rejects as a `strictObject`. One picker keeps web form state and the
 * backend record mapper on the same field list.
 */
export function pickAdminPutBookingPageInput(source: {
  enabled: AdminPutBookingPageInput["enabled"];
  durationMinutes: AdminPutBookingPageInput["durationMinutes"];
  destinationCalendarId: AdminPutBookingPageInput["destinationCalendarId"];
  blockingCalendarIds: AdminPutBookingPageInput["blockingCalendarIds"];
  timeZone: AdminPutBookingPageInput["timeZone"];
  weeklyAvailability: AdminPutBookingPageInput["weeklyAvailability"];
  welcomeText?: AdminPutBookingPageInput["welcomeText"] | null;
  minNoticeHours: AdminPutBookingPageInput["minNoticeHours"];
  maxHorizonDays: AdminPutBookingPageInput["maxHorizonDays"];
  bufferMinutes: AdminPutBookingPageInput["bufferMinutes"];
  maxBookingsPerDay: AdminPutBookingPageInput["maxBookingsPerDay"];
  guestsCanInviteOthers: AdminPutBookingPageInput["guestsCanInviteOthers"];
}): AdminPutBookingPageInput {
  return {
    enabled: source.enabled,
    durationMinutes: source.durationMinutes,
    destinationCalendarId: source.destinationCalendarId,
    blockingCalendarIds: source.blockingCalendarIds,
    timeZone: source.timeZone,
    weeklyAvailability: source.weeklyAvailability,
    welcomeText: source.welcomeText ?? null,
    minNoticeHours: source.minNoticeHours,
    maxHorizonDays: source.maxHorizonDays,
    bufferMinutes: source.bufferMinutes,
    maxBookingsPerDay: source.maxBookingsPerDay,
    guestsCanInviteOthers: source.guestsCanInviteOthers,
  };
}

/**
 * GET response for a page with no public link yet: either never saved, or
 * saved but never enabled (so no slug was allocated). `isConfigured` tells
 * those two apart, which the wire otherwise could not - both came back as a
 * bare input object. The client needs the distinction to know whether it may
 * seed the timezone from the browser: the server has no user timezone and can
 * only fill in a placeholder.
 */
export const AdminGetBookingPageSetupResponseSchema =
  AdminPutBookingPageInputSchema.extend({ isConfigured: z.boolean() });
export type AdminGetBookingPageSetupResponse = z.infer<
  typeof AdminGetBookingPageSetupResponseSchema
>;

/** Everything `GET /booking/page` can answer with. */
export type AdminGetBookingPageResult =
  | AdminGetBookingPageResponse
  | AdminGetBookingPageSetupResponse;

const slugifyBookingCandidate = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const allocateBookingSlug = (
  name: string,
  emailLocalPart: string,
  userIdSuffix: string,
  taken: ReadonlySet<string>,
): string => {
  let candidate = slugifyBookingCandidate(name);

  if (candidate.length < 3) {
    candidate = slugifyBookingCandidate(emailLocalPart);
  }

  if (candidate.length < 3) {
    candidate = `user${userIdSuffix.slice(-6)}`;
  }

  candidate = candidate.slice(0, 32);

  const isUnavailable = (slug: string): boolean =>
    BOOKING_RESERVED_SLUGS.includes(slug as BookingReservedSlug) ||
    taken.has(slug);

  if (!isUnavailable(candidate)) {
    return candidate;
  }

  for (let suffix = 2; ; suffix += 1) {
    const suffixText = String(suffix);
    const baseMaxLength = Math.max(0, 32 - suffixText.length);
    const nextCandidate = `${candidate.slice(0, baseMaxLength)}${suffixText}`;
    if (!isUnavailable(nextCandidate)) {
      return nextCandidate;
    }
  }
};
