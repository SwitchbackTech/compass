import { DateTimeSchema, TimeZoneSchema } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import {
  formatBookingMonthKey,
  getPublicBookingMonthWindow,
  isBookingMonthAvailable,
  shiftBookingMonthKey,
} from "@web/booking/public-booking.format";
import { describe, expect, it } from "bun:test";

const utc = TimeZoneSchema.parse("UTC");

describe("getPublicBookingMonthWindow", () => {
  it("starts at today and ends at the next month when the horizon allows", () => {
    const now = dayjs("2026-08-15T12:30:00.000Z");
    const window = getPublicBookingMonthWindow("2026-08", utc, 60, now);

    expect(window).not.toBeNull();
    expect(window?.start).toBe(
      DateTimeSchema.parse("2026-08-15T00:00:00.000Z"),
    );
    expect(window?.end).toBe(DateTimeSchema.parse("2026-09-01T00:00:00.000Z"));
    expect(window?.timeZone).toBe(utc);
  });

  it("clamps the month end to the host horizon", () => {
    const now = dayjs("2026-08-15T12:00:00.000Z");
    const window = getPublicBookingMonthWindow("2026-08", utc, 7, now);

    expect(window).not.toBeNull();
    expect(window?.start).toBe(
      DateTimeSchema.parse("2026-08-15T00:00:00.000Z"),
    );
    expect(window?.end).toBe(DateTimeSchema.parse("2026-08-22T12:00:00.000Z"));
  });

  it("returns a future month from the first of that month", () => {
    const now = dayjs("2026-08-15T12:00:00.000Z");
    const window = getPublicBookingMonthWindow("2026-09", utc, 60, now);

    expect(window).not.toBeNull();
    expect(window?.start).toBe(
      DateTimeSchema.parse("2026-09-01T00:00:00.000Z"),
    );
    expect(window?.end).toBe(DateTimeSchema.parse("2026-10-01T00:00:00.000Z"));
  });

  it("returns null for a past month", () => {
    const now = dayjs("2026-08-15T12:00:00.000Z");
    expect(getPublicBookingMonthWindow("2026-07", utc, 60, now)).toBeNull();
    expect(isBookingMonthAvailable("2026-07", utc, 60, now)).toBe(false);
  });

  it("returns null for a month that starts after the horizon", () => {
    const now = dayjs("2026-08-15T12:00:00.000Z");
    expect(getPublicBookingMonthWindow("2026-09", utc, 7, now)).toBeNull();
    expect(isBookingMonthAvailable("2026-09", utc, 7, now)).toBe(false);
  });
});

describe("booking month keys", () => {
  it("formats and shifts YYYY-MM keys in the guest timezone", () => {
    expect(formatBookingMonthKey("2026-08-31T22:00:00.000Z", utc)).toBe(
      "2026-08",
    );
    expect(shiftBookingMonthKey("2026-08", 1, utc)).toBe("2026-09");
    expect(shiftBookingMonthKey("2026-01", -1, utc)).toBe("2025-12");
  });
});
