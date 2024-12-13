import dayjs from "dayjs";
import { getCalendarHeadingLabel, getWeekRangeLabel } from "./web.date.util";

describe("getWeekRangeLabel", () => {
  it("should return 'M.D - D' format when week is within single month", () => {
    const weekInViewStart = dayjs("2025-01-05");
    const weekInViewEnd = dayjs("2025-01-11");
    const label = getWeekRangeLabel(weekInViewStart, weekInViewEnd);
    const expectedLabel = "1.5 - 11";
    expect(label).toBe(expectedLabel);
  });

  it("should return 'M.D - M.D' format when week covers two months", () => {
    const weekInViewStart = dayjs("2024-12-29");
    const weekInViewEnd = dayjs("2025-01-4");
    const label = getWeekRangeLabel(weekInViewStart, weekInViewEnd);
    const expectedLabel = "12.29 - 1.4";
    expect(label).toBe(expectedLabel);
  });
});

describe("getCalendarHeadingLabel", () => {
  it("should return month only when week is within a single month and today is in the same year", () => {
    const today = dayjs("2025-01-08");
    const weekInViewStart = dayjs("2025-01-05");
    const weekInViewEnd = dayjs("2025-01-11");
    const label = getCalendarHeadingLabel(
      weekInViewStart,
      weekInViewEnd,
      today
    );
    const expectedlabel = "January";
    expect(label).toBe(expectedlabel);
  });

  it("should return month and year when week is within a single month and today is in a different year", () => {
    const today = dayjs("2024-12-30");
    const weekInViewStart = dayjs("2025-01-05");
    const weekInViewEnd = dayjs("2025-01-11");
    const label = getCalendarHeadingLabel(
      weekInViewStart,
      weekInViewEnd,
      today
    );
    const expectedlabel = "January 2025";
    expect(label).toBe(expectedlabel);
  });

  it("should return 'MMM yy - MMM yy' format when week covers two months", () => {
    const today = dayjs("2024-12-30");
    const weekInViewStart = dayjs("2024-12-29");
    const weekInViewEnd = dayjs("2025-01-04");
    const label = getCalendarHeadingLabel(
      weekInViewStart,
      weekInViewEnd,
      today
    );
    const expectedlabel = "Dec 24 - Jan 25";
    expect(label).toBe(expectedlabel);
  });
});
