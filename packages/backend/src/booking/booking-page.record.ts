import { z } from "zod/v4";
import {
  BookingBufferMinutesSchema,
  BookingDurationMinutesSchema,
  BookingMaxBookingsPerDaySchema,
  BookingSlugSchema,
  BookingWelcomeTextSchema,
  WeeklyAvailabilitySchema,
} from "@core/types/booking.contracts";
import {
  CalendarIdSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { zObjectId } from "@core/types/type.utils";

const ObjectIdSchema = zObjectId;

// Existing documents may still store a leftover `dateOverrides` array from
// the removed host-only feature; it is unused leftover storage, not a live
// field. `z.object` strips unknown keys so those documents still parse.
export const BookingPageRecordSchema = z.object({
  _id: ObjectIdSchema,
  userId: ObjectIdSchema,
  bookingSlug: BookingSlugSchema.optional(),
  enabled: z.boolean(),
  durationMinutes: BookingDurationMinutesSchema,
  destinationCalendarId: CalendarIdSchema,
  blockingCalendarIds: z.array(CalendarIdSchema).min(1).readonly(),
  timeZone: TimeZoneSchema,
  weeklyAvailability: WeeklyAvailabilitySchema,
  welcomeText: BookingWelcomeTextSchema.nullable().default(null),
  minNoticeHours: z.number().int().nonnegative(),
  maxHorizonDays: z.number().int().positive().max(60),
  bufferMinutes: BookingBufferMinutesSchema,
  maxBookingsPerDay: BookingMaxBookingsPerDaySchema,
  guestsCanInviteOthers: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BookingPageRecord = z.infer<typeof BookingPageRecordSchema>;
