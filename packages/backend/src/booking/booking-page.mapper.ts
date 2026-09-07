import {
  type AdminGetBookingPageResponse,
  type AdminGetBookingPageSetupResponse,
  type AdminPutBookingPageInput,
  type BookingPage,
  BookingPageSchema,
  DEFAULT_WEEKLY_AVAILABILITY,
  pickAdminPutBookingPageInput,
} from "@core/types/booking.contracts";
import { CalendarIdSchema, type TimeZone } from "@core/types/domain-primitives";
import { type BookingPageRecord } from "@backend/booking/booking-page.record";
import { CONFIG } from "@backend/common/constants/config.constants";

export const buildBookingUrl = (slug: string): string =>
  new URL(`/book/${slug}`, CONFIG.FRONTEND_URL).href;

export const mapBookingPageRecordToWire = (
  record: BookingPageRecord & { bookingSlug: string },
): BookingPage =>
  BookingPageSchema.parse({
    id: record._id.toString(),
    slug: record.bookingSlug,
    hostUserId: record.userId.toString(),
    enabled: record.enabled,
    durationMinutes: record.durationMinutes,
    destinationCalendarId: record.destinationCalendarId,
    blockingCalendarIds: record.blockingCalendarIds,
    timeZone: record.timeZone,
    weeklyAvailability: record.weeklyAvailability,
    welcomeText: record.welcomeText ?? null,
    minNoticeHours: record.minNoticeHours,
    maxHorizonDays: record.maxHorizonDays,
    bufferMinutes: record.bufferMinutes,
    maxBookingsPerDay: record.maxBookingsPerDay,
    guestsCanInviteOthers: record.guestsCanInviteOthers,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });

export const mapBookingPageRecordToAdminResponse = (
  record: BookingPageRecord & { bookingSlug: string },
): AdminGetBookingPageResponse => ({
  ...mapBookingPageRecordToWire(record),
  bookingUrl: buildBookingUrl(record.bookingSlug),
});

/**
 * A record that was saved but never enabled has no slug and no public URL.
 * isConfigured: true tells the client the host's stored timezone is a real
 * choice that must not be re-seeded from the calendar view.
 */
export const mapBookingPageRecordToSetupResponse = (
  record: Pick<
    BookingPageRecord,
    | "enabled"
    | "durationMinutes"
    | "destinationCalendarId"
    | "blockingCalendarIds"
    | "timeZone"
    | "weeklyAvailability"
    | "welcomeText"
    | "minNoticeHours"
    | "maxHorizonDays"
    | "bufferMinutes"
    | "maxBookingsPerDay"
    | "guestsCanInviteOthers"
  >,
): AdminGetBookingPageSetupResponse => ({
  ...pickAdminPutBookingPageInput(record),
  isConfigured: true,
});

export const mapPutInputToRecordFields = (
  input: AdminPutBookingPageInput,
): Omit<
  BookingPageRecord,
  "_id" | "userId" | "bookingSlug" | "createdAt" | "updatedAt"
> => pickAdminPutBookingPageInput(input);

const PLACEHOLDER_CALENDAR_ID = CalendarIdSchema.parse(
  "000000000000000000000001",
);

export const buildDefaultAdminPutInput = (
  timeZone: TimeZone,
): AdminPutBookingPageInput => ({
  enabled: false,
  durationMinutes: 30,
  destinationCalendarId: PLACEHOLDER_CALENDAR_ID,
  blockingCalendarIds: [PLACEHOLDER_CALENDAR_ID],
  timeZone,
  weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  welcomeText: null,
  minNoticeHours: 4,
  maxHorizonDays: 60,
  bufferMinutes: null,
  maxBookingsPerDay: null,
  guestsCanInviteOthers: true,
});
