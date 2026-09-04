import { faker } from "@faker-js/faker";
import {
  AdminGetBookingPageResponseSchema,
  AdminPutBookingPageInputSchema,
  allocateBookingSlug,
  BOOKING_MAX_BUFFER_MINUTES,
  BOOKING_MAX_MIN_NOTICE_HOURS,
  BookingPageSchema,
  BookingReservationSlotsQuerySchema,
  BookingSlugSchema,
  CancelBookingReservationInputSchema,
  CreateBookingReservationInputSchema,
  CreateBookingReservationResponseSchema,
  isGuestEmail,
  PatchBookingReservationInputSchema,
  PublicBookingPageSchema,
  PublicGetBookingPageResponseSchema,
  PublicGetBookingReservationResponseSchema,
  pickAdminPutBookingPageInput,
  RescheduleBookingReservationInputSchema,
  RescheduleBookingReservationResponseSchema,
  toPublicBookingPage,
  WeeklyAvailabilityIntervalSchema,
} from "@core/types/booking.contracts";
import { describe, expect, it } from "bun:test";

const calendarId = () => faker.database.mongodbObjectId();
const objectId = () => faker.database.mongodbObjectId();
const dateTime = () => "2026-08-30T12:00:00.000Z";

const fullAdminPage = () => ({
  id: objectId(),
  slug: "tylerdane",
  hostUserId: objectId(),
  enabled: true,
  durationMinutes: 30 as const,
  destinationCalendarId: calendarId(),
  blockingCalendarIds: [calendarId()],
  timeZone: "America/Denver",
  weeklyAvailability: [
    { weekday: 1 as const, start: "09:00", end: "17:00" },
    { weekday: 3 as const, start: "10:00", end: "12:00" },
  ],
  minNoticeHours: 4,
  maxHorizonDays: 60,
  bufferMinutes: null,
  maxBookingsPerDay: null,
  guestsCanInviteOthers: true,
  createdAt: dateTime(),
  updatedAt: dateTime(),
});

describe("BookingSlugSchema", () => {
  it("accepts a valid slug", () => {
    expect(BookingSlugSchema.safeParse("tylerdane").success).toBe(true);
  });

  it("rejects an empty slug", () => {
    expect(BookingSlugSchema.safeParse("").success).toBe(false);
  });

  it("rejects reserved slug week", () => {
    expect(BookingSlugSchema.safeParse("week").success).toBe(false);
  });

  it("rejects uppercase characters", () => {
    expect(BookingSlugSchema.safeParse("TylerDane").success).toBe(false);
  });
});

describe("BookingPageSchema", () => {
  it("parses a full admin page JSON", () => {
    expect(BookingPageSchema.safeParse(fullAdminPage()).success).toBe(true);
  });

  it("rejects duration 20", () => {
    expect(
      BookingPageSchema.safeParse({
        ...fullAdminPage(),
        durationMinutes: 20,
      }).success,
    ).toBe(false);
  });

  it("rejects weekday 0 on weekly availability", () => {
    expect(
      BookingPageSchema.safeParse({
        ...fullAdminPage(),
        weeklyAvailability: [{ weekday: 0, start: "09:00", end: "17:00" }],
      }).success,
    ).toBe(false);
  });

  it("rejects maxHorizonDays above 60", () => {
    expect(
      BookingPageSchema.safeParse({
        ...fullAdminPage(),
        maxHorizonDays: 61,
      }).success,
    ).toBe(false);
  });

  it("accepts minNoticeHours and bufferMinutes at their caps and rejects above", () => {
    const base = {
      enabled: true,
      durationMinutes: 30,
      destinationCalendarId: calendarId(),
      blockingCalendarIds: [calendarId()],
      timeZone: "UTC",
      weeklyAvailability: [{ weekday: 1, start: "09:00", end: "17:00" }],
      minNoticeHours: 4,
      maxHorizonDays: 60,
      bufferMinutes: null as number | null,
      maxBookingsPerDay: null,
      guestsCanInviteOthers: true,
    };

    expect(
      AdminPutBookingPageInputSchema.safeParse({
        ...base,
        minNoticeHours: BOOKING_MAX_MIN_NOTICE_HOURS,
      }).success,
    ).toBe(true);
    expect(
      AdminPutBookingPageInputSchema.safeParse({
        ...base,
        minNoticeHours: BOOKING_MAX_MIN_NOTICE_HOURS + 1,
      }).success,
    ).toBe(false);
    expect(
      AdminPutBookingPageInputSchema.safeParse({
        ...base,
        bufferMinutes: BOOKING_MAX_BUFFER_MINUTES,
      }).success,
    ).toBe(true);
    expect(
      AdminPutBookingPageInputSchema.safeParse({
        ...base,
        bufferMinutes: BOOKING_MAX_BUFFER_MINUTES + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects overlapping intervals on the same weekday", () => {
    expect(
      BookingPageSchema.safeParse({
        ...fullAdminPage(),
        weeklyAvailability: [
          { weekday: 2, start: "09:00", end: "12:00" },
          { weekday: 2, start: "11:00", end: "13:00" },
        ],
      }).success,
    ).toBe(false);
  });

  it("allows non-overlapping intervals on different weekdays", () => {
    const page = fullAdminPage();
    expect(BookingPageSchema.safeParse(page).success).toBe(true);
  });
});

describe("PublicBookingPageSchema", () => {
  it("has no calendar ids in the shape", () => {
    const keys = PublicBookingPageSchema.keyof().options;
    expect(keys).toEqual([
      "hostDisplayName",
      "durationMinutes",
      "timeZone",
      "enabled",
      "maxHorizonDays",
      "welcomeText",
      "createsGoogleMeet",
    ]);
  });

  it("projects an admin page without calendar ids or date overrides", () => {
    const admin = BookingPageSchema.parse(fullAdminPage());
    const pub = toPublicBookingPage(admin, "Tyler Dane", true);

    expect(PublicBookingPageSchema.safeParse(pub).success).toBe(true);
    expect(pub).toEqual({
      hostDisplayName: "Tyler Dane",
      durationMinutes: 30,
      timeZone: "America/Denver",
      enabled: true,
      maxHorizonDays: 60,
      welcomeText: null,
      createsGoogleMeet: true,
    });
    expect(Object.keys(pub)).not.toContain("destinationCalendarId");
    expect(Object.keys(pub)).not.toContain("blockingCalendarIds");
    expect(Object.keys(pub)).not.toContain("dateOverrides");
  });

  it("picks only the admin PUT fields from a full page", () => {
    const page = BookingPageSchema.parse(fullAdminPage());
    expect(pickAdminPutBookingPageInput(page)).toEqual({
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
    });
    expect(pickAdminPutBookingPageInput(page)).not.toHaveProperty("id");
    expect(pickAdminPutBookingPageInput(page)).not.toHaveProperty("slug");
  });
});

describe("welcome text", () => {
  it("defaults missing welcomeText", () => {
    const page = BookingPageSchema.parse(fullAdminPage());
    expect(page.welcomeText).toBeNull();
  });

  it("parses welcome text on admin put input", () => {
    const parsed = AdminPutBookingPageInputSchema.safeParse({
      enabled: true,
      durationMinutes: 30,
      destinationCalendarId: calendarId(),
      blockingCalendarIds: [calendarId()],
      timeZone: "America/Denver",
      weeklyAvailability: [{ weekday: 1, start: "09:00", end: "12:00" }],
      welcomeText: "30 minutes to talk through Compass Calendar.",
      minNoticeHours: 4,
      maxHorizonDays: 60,
      bufferMinutes: null,
      maxBookingsPerDay: null,
      guestsCanInviteOthers: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.welcomeText).toBe(
        "30 minutes to talk through Compass Calendar.",
      );
    }
  });

  it("rejects welcome text longer than 500 characters", () => {
    expect(
      AdminPutBookingPageInputSchema.safeParse({
        enabled: false,
        durationMinutes: 30,
        destinationCalendarId: calendarId(),
        blockingCalendarIds: [calendarId()],
        timeZone: "UTC",
        weeklyAvailability: [],
        welcomeText: "w".repeat(501),
        minNoticeHours: 4,
        maxHorizonDays: 60,
        bufferMinutes: null,
        maxBookingsPerDay: null,
        guestsCanInviteOthers: true,
      }).success,
    ).toBe(false);
  });
});

describe("WeeklyAvailabilityIntervalSchema", () => {
  it("rejects end before start", () => {
    expect(
      WeeklyAvailabilityIntervalSchema.safeParse({
        weekday: 1,
        start: "17:00",
        end: "09:00",
      }).success,
    ).toBe(false);
  });
});

describe("allocateBookingSlug", () => {
  it("allocates tylerdane for Tyler Dane when free", () => {
    expect(
      allocateBookingSlug("Tyler Dane", "tyler", "abcdef123456", new Set()),
    ).toBe("tylerdane");
  });

  it("uses the email local-part when the name slugifies too short", () => {
    expect(
      allocateBookingSlug("Al", "ada.lovelace", "abcdef123456", new Set()),
    ).toBe("adalovelace");
  });

  it("uses user plus the user id suffix when still too short", () => {
    expect(allocateBookingSlug("Al", "a", "abcdef123456", new Set())).toBe(
      "user123456",
    );
  });

  it("appends a numeric suffix when the candidate is taken", () => {
    expect(
      allocateBookingSlug(
        "Tyler Dane",
        "tyler",
        "abcdef123456",
        new Set(["tylerdane"]),
      ),
    ).toBe("tylerdane2");
  });

  it("appends a numeric suffix when the candidate is reserved", () => {
    expect(allocateBookingSlug("Week", "week", "abcdef123456", new Set())).toBe(
      "week2",
    );
  });

  it("truncates long candidates to 32 characters before suffixing", () => {
    const longName = "abcdefghijklmnopqrstuvwxyz1234567890extra";
    const slug = allocateBookingSlug(longName, "x", "abcdef123456", new Set());
    expect(slug.length).toBeLessThanOrEqual(32);
    expect(slug).toBe("abcdefghijklmnopqrstuvwxyz123456");
  });
});

describe("HTTP booking contracts", () => {
  it("parses public page and admin responses", () => {
    const admin = fullAdminPage();
    expect(
      PublicGetBookingPageResponseSchema.safeParse({
        hostDisplayName: "Tyler Dane",
        durationMinutes: admin.durationMinutes,
        timeZone: admin.timeZone,
        enabled: admin.enabled,
        maxHorizonDays: admin.maxHorizonDays,
        welcomeText: null,
      }).success,
    ).toBe(true);

    expect(
      AdminGetBookingPageResponseSchema.safeParse({
        ...admin,
        bookingUrl: "https://compasscalendar.com/book/tylerdane",
      }).success,
    ).toBe(true);
  });

  it("parses admin replace input without server-managed fields", () => {
    const admin = fullAdminPage();
    const { id, slug, hostUserId, createdAt, updatedAt, ...replaceInput } =
      admin;

    expect(AdminPutBookingPageInputSchema.safeParse(replaceInput).success).toBe(
      true,
    );
    expect(id).toBeDefined();
    expect(slug).toBeDefined();
  });

  it("accepts a simple guest email and rejects missing domains", () => {
    expect(isGuestEmail("ada@example.com")).toBe(true);
    expect(isGuestEmail("not-an-email")).toBe(false);
    expect(isGuestEmail("missing@domain")).toBe(false);
  });

  it("parses create reservation input", () => {
    expect(
      CreateBookingReservationInputSchema.safeParse({
        slotStart: "2026-09-01T15:00:00.000Z",
        guestName: "Ada Lovelace",
        guestEmail: "ada@example.com",
        guestTimeZone: "Europe/London",
      }).success,
    ).toBe(true);
  });

  it("parses a public reservation GET with name and notes, not email", () => {
    const publicGet = {
      slotStart: "2026-09-01T15:00:00.000Z",
      guestTimeZone: "Europe/London",
      durationMinutes: 30,
      hostDisplayName: "Tyler Dane",
      status: "confirmed",
      bookingSlug: "tylerdane",
      guestName: "Ada Lovelace",
      notes: "bring coffee",
    };
    expect(
      PublicGetBookingReservationResponseSchema.safeParse(publicGet).success,
    ).toBe(true);
    expect(
      PublicGetBookingReservationResponseSchema.parse(publicGet)
        .createsGoogleMeet,
    ).toBe(true);
    expect(
      PublicGetBookingReservationResponseSchema.safeParse({
        slotStart: "2026-09-01T15:00:00.000Z",
        guestTimeZone: "Europe/London",
        durationMinutes: 30,
        hostDisplayName: "Tyler Dane",
        status: "confirmed",
        bookingSlug: "tylerdane",
      }).success,
    ).toBe(false);
    expect(
      PublicGetBookingReservationResponseSchema.safeParse({
        ...publicGet,
        guestEmail: "ada@example.com",
      }).success,
    ).toBe(false);
  });

  it("parses a guest details PATCH and rejects email or empty edits", () => {
    expect(
      PatchBookingReservationInputSchema.safeParse({
        token: "abc",
        name: "Grace Hopper",
        notes: "bring tea",
      }).success,
    ).toBe(true);
    expect(
      PatchBookingReservationInputSchema.safeParse({
        token: "abc",
        notes: "",
      }).success,
    ).toBe(true);
    expect(
      PatchBookingReservationInputSchema.safeParse({
        token: "abc",
      }).success,
    ).toBe(false);
    expect(
      PatchBookingReservationInputSchema.safeParse({
        token: "abc",
        name: "Ada Lovelace",
        guestEmail: "ada@example.com",
      }).success,
    ).toBe(false);
  });

  it("requires rescheduleUrl on create reservation responses", () => {
    const created = {
      reservationId: objectId(),
      slotStart: "2026-09-01T15:00:00.000Z",
      slotEnd: "2026-09-01T15:30:00.000Z",
      guestTimeZone: "Europe/London",
      cancelUrl:
        "https://compasscalendar.com/book/cancel/000000000000000000000099?token=abc",
      rescheduleUrl:
        "https://compasscalendar.com/book/reschedule/000000000000000000000099?token=abc",
    };
    expect(
      CreateBookingReservationResponseSchema.safeParse(created).success,
    ).toBe(true);
    expect(
      CreateBookingReservationResponseSchema.safeParse({
        reservationId: created.reservationId,
        slotStart: created.slotStart,
        slotEnd: created.slotEnd,
        guestTimeZone: created.guestTimeZone,
        cancelUrl: created.cancelUrl,
      }).success,
    ).toBe(false);
  });

  it("parses reschedule input and rejects extra keys", () => {
    expect(
      RescheduleBookingReservationInputSchema.safeParse({
        token: "abc",
        slotStart: "2026-09-01T15:00:00.000Z",
        guestTimeZone: "Europe/London",
      }).success,
    ).toBe(true);
    expect(
      RescheduleBookingReservationInputSchema.safeParse({
        token: "abc",
        slotStart: "2026-09-01T15:00:00.000Z",
        guestTimeZone: "Europe/London",
        notes: "extra",
      }).success,
    ).toBe(false);
  });

  it("parses a reschedule response with the updated slot", () => {
    expect(
      RescheduleBookingReservationResponseSchema.safeParse({
        reservationId: objectId(),
        slotStart: "2026-09-02T15:00:00.000Z",
        slotEnd: "2026-09-02T15:30:00.000Z",
        guestTimeZone: "Europe/London",
        durationMinutes: 30,
        hostDisplayName: "Tyler Dane",
        status: "confirmed",
        bookingSlug: "tylerdane",
      }).success,
    ).toBe(true);
  });

  it("parses tokenized reservation slots query and rejects extra keys", () => {
    expect(
      BookingReservationSlotsQuerySchema.safeParse({
        token: "abc",
        start: "2026-09-01T00:00:00.000Z",
        end: "2026-09-30T00:00:00.000Z",
        timeZone: "Europe/London",
      }).success,
    ).toBe(true);
    expect(
      BookingReservationSlotsQuerySchema.safeParse({
        token: "abc",
        start: "2026-09-01T00:00:00.000Z",
        end: "2026-09-30T00:00:00.000Z",
        timeZone: "Europe/London",
        slug: "tylerdane",
      }).success,
    ).toBe(false);
  });

  it("keeps cancel input as token only", () => {
    expect(
      CancelBookingReservationInputSchema.safeParse({ token: "abc" }).success,
    ).toBe(true);
    expect(
      CancelBookingReservationInputSchema.safeParse({
        token: "abc",
        slotStart: "2026-09-01T15:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejects reserved slug confirmed", () => {
    expect(BookingSlugSchema.safeParse("confirmed").success).toBe(false);
    expect(BookingSlugSchema.safeParse("cancel").success).toBe(false);
  });

  it("rejects reserved slug reschedule", () => {
    expect(BookingSlugSchema.safeParse("reschedule").success).toBe(false);
  });
});
