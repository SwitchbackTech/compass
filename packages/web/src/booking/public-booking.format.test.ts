import { DateTimeSchema, TimeZoneSchema } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import {
  formatBookingMonthKey,
  getPublicBookingMonthWindow,
  isBookingMonthAvailable,
  listBookingAvailableDayKeys,
  listBookingMonthGridWeeks,
  shiftBookingMonthKey,
  stepBookingAvailableDay,
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

describe("listBookingMonthGridWeeks", () => {
  it("highlights only days that have slots and are not before today", () => {
    const weeks = listBookingMonthGridWeeks(
      "2026-08",
      utc,
      new Set(["2026-08-10", "2026-08-17", "2026-08-20"]),
      "2026-08-15",
    );
    const days = weeks.flat().filter((cell) => cell.kind === "day");

    expect(days[0]?.kind === "day" && days[0].day.dayOfMonth).toBe(1);
    expect(weeks[0]?.filter((cell) => cell.kind === "pad")).toHaveLength(6);

    const available = listBookingAvailableDayKeys(weeks);
    expect(available).toEqual(["2026-08-17", "2026-08-20"]);

    const tenth = days.find(
      (cell) => cell.kind === "day" && cell.day.dateKey === "2026-08-10",
    );
    expect(tenth?.kind === "day" && tenth.day.available).toBe(false);

    const sixteenth = days.find(
      (cell) => cell.kind === "day" && cell.day.dateKey === "2026-08-16",
    );
    expect(sixteenth?.kind === "day" && sixteenth.day.available).toBe(false);
  });

  it("does not highlight days past the last available date in a horizon-clamped month", () => {
    const weeks = listBookingMonthGridWeeks(
      "2026-08",
      utc,
      new Set(["2026-08-16", "2026-08-22"]),
      "2026-08-15",
    );
    expect(listBookingAvailableDayKeys(weeks)).toEqual([
      "2026-08-16",
      "2026-08-22",
    ]);
    const twentyThird = weeks
      .flat()
      .find((cell) => cell.kind === "day" && cell.day.dateKey === "2026-08-23");
    expect(twentyThird?.kind === "day" && twentyThird.day.available).toBe(
      false,
    );
  });
});

describe("stepBookingAvailableDay", () => {
  it("moves across available days and stays in-month on week edges", () => {
    const available = ["2026-08-17", "2026-08-20", "2026-08-24"];
    expect(stepBookingAvailableDay("2026-08-17", available, utc, "next")).toBe(
      "2026-08-20",
    );
    expect(
      stepBookingAvailableDay("2026-08-17", available, utc, "previous"),
    ).toBe("2026-08-17");
    expect(
      stepBookingAvailableDay("2026-08-17", available, utc, "nextWeek"),
    ).toBe("2026-08-24");
    expect(
      stepBookingAvailableDay("2026-08-24", available, utc, "nextWeek"),
    ).toBe("2026-08-24");
  });
});
