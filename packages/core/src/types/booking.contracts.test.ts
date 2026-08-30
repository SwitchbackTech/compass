import { faker } from "@faker-js/faker";
import {
  AdminGetBookingPageResponseSchema,
  AdminPutBookingPageInputSchema,
  allocateBookingSlug,
  BookingPageSchema,
  BookingSlugSchema,
  CreateBookingReservationInputSchema,
  PublicBookingPageSchema,
  PublicGetBookingPageResponseSchema,
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
    ]);
  });

  it("projects an admin page without calendar ids", () => {
    const admin = BookingPageSchema.parse(fullAdminPage());
    const pub = toPublicBookingPage(admin, "Tyler Dane");

    expect(PublicBookingPageSchema.safeParse(pub).success).toBe(true);
    expect(pub).toEqual({
      hostDisplayName: "Tyler Dane",
      durationMinutes: 30,
      timeZone: "America/Denver",
      enabled: true,
    });
    expect(Object.keys(pub)).not.toContain("destinationCalendarId");
    expect(Object.keys(pub)).not.toContain("blockingCalendarIds");
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
});
