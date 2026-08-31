import { MongoServerError, type ObjectId } from "mongodb";
import {
  type ComputeBookingSlotsInput,
  computeBookingSlots,
} from "@core/booking/compute-booking-slots";
import {
  BookingDurationMinutesSchema,
  BookingSlotsQuerySchema,
  type BookingSlotsResponse,
  BookingSlotsResponseSchema,
  CancelBookingReservationInputSchema,
  CreateBookingReservationInputSchema,
  CreateBookingReservationResponseSchema,
  type PublicBookingPage,
  PublicBookingPageSchema,
  type PublicGetBookingReservationResponse,
  PublicGetBookingReservationResponseSchema,
  toPublicBookingPage,
} from "@core/types/booking.contracts";
import { DateTimeSchema, type EventId } from "@core/types/domain-primitives";
import {
  BUSY_QUERY_MAX_WINDOW_MS,
  type BusyAvailabilityResponse,
} from "@core/types/sync/availability.contracts";
import dayjs from "@core/util/date/dayjs";
import { bookingError } from "@backend/booking/booking.error";
import {
  generateCancelToken,
  hashCancelToken,
  verifyCancelToken,
} from "@backend/booking/booking-cancel-token";
import { type BookingPageRecord } from "@backend/booking/booking-page.record";
import { bookingPageRepository } from "@backend/booking/booking-page.repository";
import { bookingReservationRepository } from "@backend/booking/booking-reservation.repository";
import { type CalendarBookingPort } from "@backend/booking/services/calendar-booking.port";
import { CalendarBookingService } from "@backend/booking/services/calendar-booking.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";

const GUEST_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isDuplicateSlotError = (error: unknown): boolean =>
  error instanceof MongoServerError && error.code === 11000;

const buildCancelUrl = (reservationId: string, token: string): string =>
  new URL(
    `/book/cancel/${reservationId}?token=${encodeURIComponent(token)}`,
    CONFIG.FRONTEND_URL,
  ).href;

const assertGuestEmail = (email: string): void => {
  if (!GUEST_EMAIL_PATTERN.test(email)) {
    throw bookingError("INVALID_INPUT", "Invalid guest email");
  }
};

const resolveEnabledPage = async (
  slug: string,
): Promise<BookingPageRecord & { bookingSlug: string }> => {
  const record = await bookingPageRepository.findBySlug(slug);
  if (!record?.bookingSlug || !record.enabled) {
    throw bookingError("PAGE_NOT_FOUND", "Booking page not found");
  }
  return { ...record, bookingSlug: record.bookingSlug };
};

const getHostDisplayName = async (userId: ObjectId): Promise<string> => {
  const user = await mongoService.user.findOne(
    { _id: userId },
    { projection: { name: 1 } },
  );
  const name = user?.name?.trim();
  if (!name) {
    throw bookingError("PAGE_NOT_FOUND", "Booking page not found");
  }
  return name;
};

const parseSlotsQuery = (rawQuery: unknown) => {
  const query = BookingSlotsQuerySchema.parse(rawQuery);
  const startMs = Date.parse(query.start);
  const endMs = Date.parse(query.end);
  if (endMs <= startMs) {
    throw bookingError("INVALID_INPUT", "end must be after start");
  }
  if (endMs - startMs > BUSY_QUERY_MAX_WINDOW_MS) {
    throw bookingError("INVALID_INPUT", "window must not exceed 60 days");
  }
  return query;
};

const slotEndForStart = (slotStart: Date, durationMinutes: number): Date =>
  new Date(slotStart.getTime() + durationMinutes * 60_000);

/**
 * Every page-derived knob the slot engine reads, in one place.
 *
 * `getSlots` and `createReservation` must agree exactly on what the engine is
 * told, or a slot the guest was offered could be rejected (or, worse, accepted)
 * by the re-check. Building both inputs here removes the chance of the two
 * eleven-field literals drifting apart.
 */
const slotEngineInputForPage = (
  page: BookingPageRecord,
  availability: BusyAvailabilityResponse,
  confirmedReservationStarts: readonly Date[],
  window: { now: Date; windowStart: Date; windowEnd: Date },
): ComputeBookingSlotsInput => ({
  timeZone: page.timeZone,
  durationMinutes: page.durationMinutes,
  weeklyAvailability: page.weeklyAvailability,
  minNoticeHours: page.minNoticeHours,
  maxHorizonDays: page.maxHorizonDays,
  bufferMinutes: page.bufferMinutes,
  maxBookingsPerDay: page.maxBookingsPerDay,
  busyIntervals: availability.intervals.map((interval) => ({
    start: new Date(interval.start),
    end: new Date(interval.end),
  })),
  confirmedReservationStarts,
  now: window.now,
  windowStart: window.windowStart,
  windowEnd: window.windowEnd,
});

export class PublicBookingService {
  constructor(private readonly calendarBookingPort?: CalendarBookingPort) {}

  private get calendarBooking(): CalendarBookingPort {
    return this.calendarBookingPort ?? new CalendarBookingService();
  }

  async getPublicPage(slug: string): Promise<PublicBookingPage> {
    const page = await resolveEnabledPage(slug);
    const hostDisplayName = await getHostDisplayName(page.userId);
    return PublicBookingPageSchema.parse(
      toPublicBookingPage(page, hostDisplayName),
    );
  }

  async getSlots(
    slug: string,
    rawQuery: unknown,
  ): Promise<BookingSlotsResponse> {
    const page = await resolveEnabledPage(slug);
    const query = parseSlotsQuery(rawQuery);
    const now = new Date();
    const windowStart = new Date(query.start);
    const requestedEnd = new Date(query.end);
    const horizonEnd = dayjs(now).add(page.maxHorizonDays, "day").toDate();
    const windowEnd =
      requestedEnd.getTime() > horizonEnd.getTime() ? horizonEnd : requestedEnd;

    if (windowEnd.getTime() <= windowStart.getTime()) {
      return BookingSlotsResponseSchema.parse({
        slots: [],
        bookable: true,
      });
    }

    const availability = await this.calendarBooking.getAvailability(
      page.userId.toString(),
      {
        calendarIds: page.blockingCalendarIds,
        start: query.start,
        end: DateTimeSchema.parse(windowEnd.toISOString()),
      },
    );

    if (!availability.bookable) {
      return BookingSlotsResponseSchema.parse({
        slots: [],
        bookable: false,
      });
    }

    const confirmedStarts =
      await bookingReservationRepository.listConfirmedStartsByPageId(page._id);
    const slotStarts = computeBookingSlots(
      slotEngineInputForPage(page, availability, confirmedStarts, {
        now,
        windowStart,
        windowEnd,
      }),
    );

    return BookingSlotsResponseSchema.parse({
      bookable: true,
      slots: slotStarts.map((slotStart) => ({
        slotStart,
        slotEnd: slotEndForStart(
          new Date(slotStart),
          page.durationMinutes,
        ).toISOString(),
      })),
    });
  }

  async createReservation(slug: string, rawInput: unknown) {
    const page = await resolveEnabledPage(slug);
    const input = CreateBookingReservationInputSchema.parse(rawInput);
    assertGuestEmail(input.guestEmail);

    const slotStart = new Date(input.slotStart);
    const slotEnd = slotEndForStart(slotStart, page.durationMinutes);
    const now = new Date();
    const minNoticeMs = page.minNoticeHours * 60 * 60 * 1000;
    if (slotStart.getTime() < now.getTime() + minNoticeMs) {
      throw bookingError(
        "SLOT_UNAVAILABLE",
        "Selected slot is no longer available",
      );
    }

    const availability = await this.calendarBooking.getAvailability(
      page.userId.toString(),
      {
        calendarIds: page.blockingCalendarIds,
        start: input.slotStart,
        end: DateTimeSchema.parse(slotEnd.toISOString()),
      },
    );
    if (!availability.bookable) {
      throw bookingError(
        "SLOT_UNAVAILABLE",
        "Booking is temporarily unavailable",
      );
    }

    const confirmedStarts =
      await bookingReservationRepository.listConfirmedStartsByPageId(page._id);
    const allowedStarts = new Set(
      computeBookingSlots(
        slotEngineInputForPage(page, availability, confirmedStarts, {
          now,
          windowStart: slotStart,
          windowEnd: slotEnd,
        }),
      ).map((start) => Date.parse(start)),
    );

    if (!allowedStarts.has(slotStart.getTime())) {
      throw bookingError(
        "SLOT_UNAVAILABLE",
        "Selected slot is no longer available",
      );
    }

    const hostDisplayName = await getHostDisplayName(page.userId);
    const cancelToken = generateCancelToken();
    const reservationId = mongoService.objectId();
    const cancelUrl = buildCancelUrl(reservationId.toString(), cancelToken);

    let calendarEventId: EventId | null = null;
    try {
      calendarEventId = await this.calendarBooking.createBookingEvent(
        page.userId.toString(),
        {
          calendarId: page.destinationCalendarId,
          title: `${input.guestName} and ${hostDisplayName}`,
          // The cancel URL is a capability: anyone holding it can cancel. When
          // the guest may invite others, every invitee sees the description, so
          // keep the URL out of it — the guest gets it on the confirmation page.
          description: [
            input.notes?.trim(),
            page.guestsCanInviteOthers ? null : `Cancel: ${cancelUrl}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
          start: input.slotStart,
          end: DateTimeSchema.parse(slotEnd.toISOString()),
          timeZone: page.timeZone,
          guest: {
            email: input.guestEmail,
            displayName: input.guestName,
          },
          guestsCanInviteOthers: page.guestsCanInviteOthers,
        },
      );

      const reservation = await bookingReservationRepository.insert({
        _id: reservationId,
        pageId: page._id,
        slotStart,
        slotEnd,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        notes: input.notes?.trim() ?? null,
        guestTimeZone: input.guestTimeZone,
        status: "confirmed",
        calendarEventId,
        cancelTokenHash: hashCancelToken(cancelToken),
      });

      // Close the overlap race the unique index cannot see: the index only
      // serializes identical starts, but two concurrent confirms on adjacent
      // grid starts (10:00 and 10:15 for a 30-minute duration) both pass the
      // pre-insert engine check. Re-checking after our own insert guarantees
      // the later checker sees both docs, so at most one overlapping
      // reservation survives; in the rare symmetric case both yield 409 and
      // the slot reopens. Deliberately not "smallest _id wins": ids are minted
      // before the slow calendar call, so id order does not track insert order
      // and both racers could each conclude they had won.
      const overlapping =
        await bookingReservationRepository.listConfirmedOverlapping(
          page._id,
          slotStart,
          slotEnd,
        );
      if (overlapping.some((id) => !id.equals(reservationId))) {
        await bookingReservationRepository.deleteById(reservationId);
        throw bookingError(
          "SLOT_UNAVAILABLE",
          "Selected slot is no longer available",
        );
      }

      return CreateBookingReservationResponseSchema.parse({
        reservationId: reservation._id.toString(),
        slotStart: reservation.slotStart.toISOString(),
        slotEnd: reservation.slotEnd.toISOString(),
        guestTimeZone: reservation.guestTimeZone,
        cancelUrl,
      });
    } catch (error) {
      if (calendarEventId) {
        await this.calendarBooking
          .deleteBookingEvent(page.userId.toString(), {
            eventId: calendarEventId,
          })
          .catch(() => undefined);
      }
      if (isDuplicateSlotError(error)) {
        throw bookingError(
          "SLOT_UNAVAILABLE",
          "Selected slot is no longer available",
        );
      }
      throw error;
    }
  }

  async getPublicReservation(
    reservationId: ObjectId,
  ): Promise<PublicGetBookingReservationResponse> {
    const reservation =
      await bookingReservationRepository.findById(reservationId);
    if (!reservation) {
      throw bookingError("RESERVATION_NOT_FOUND", "Reservation not found");
    }

    const page = await bookingPageRepository.findById(reservation.pageId);
    if (!page) {
      throw bookingError("RESERVATION_NOT_FOUND", "Reservation not found");
    }

    const hostDisplayName = await getHostDisplayName(page.userId);
    const fromSlot = Math.round(
      (reservation.slotEnd.getTime() - reservation.slotStart.getTime()) /
        60_000,
    );
    const durationMinutes = BookingDurationMinutesSchema.safeParse(fromSlot)
      .success
      ? fromSlot
      : page.durationMinutes;
    return PublicGetBookingReservationResponseSchema.parse({
      slotStart: reservation.slotStart.toISOString(),
      guestTimeZone: reservation.guestTimeZone,
      durationMinutes,
      hostDisplayName,
      status: reservation.status,
    });
  }

  async cancelReservation(
    reservationId: ObjectId,
    rawInput: unknown,
  ): Promise<void> {
    const { token } = CancelBookingReservationInputSchema.parse(rawInput);
    const reservation =
      await bookingReservationRepository.findById(reservationId);
    if (
      !reservation ||
      !verifyCancelToken(reservation.cancelTokenHash, token)
    ) {
      throw bookingError("RESERVATION_NOT_FOUND", "Reservation not found");
    }

    if (reservation.status === "cancelled") {
      return;
    }

    const pageRecord = await mongoService.bookingPage.findOne({
      _id: reservation.pageId,
    });
    if (!pageRecord) {
      throw bookingError("RESERVATION_NOT_FOUND", "Reservation not found");
    }

    if (reservation.calendarEventId) {
      await this.calendarBooking.deleteBookingEvent(
        pageRecord.userId.toString(),
        { eventId: reservation.calendarEventId as EventId },
      );
    }

    await bookingReservationRepository.markCancelled(reservationId);
  }
}

export default new PublicBookingService();
