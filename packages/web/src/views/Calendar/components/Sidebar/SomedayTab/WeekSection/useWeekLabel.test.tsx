import dayjs, { Dayjs } from "dayjs";
import "@testing-library/jest-dom";
import {
  getSomedayWeekLabel,
  isCurrentWeek,
} from "@web/views/Calendar/components/Sidebar/SomedayTab/WeekSection/useWeekLabel";

const makeLabel = (start: Dayjs, end: Dayjs): string =>
  `${start.format("M.D")} - ${end.format("M.D")}`;

describe("isCurrentWeek()", () => {
  it("returns true when today is inside range", () => {
    const today = dayjs("2025-01-10");
    const label = makeLabel(dayjs("2025-01-08"), dayjs("2025-01-12"));
    const result = isCurrentWeek(label, today, today);
    expect(result).toBe(true);
  });

  it("returns false when today is before range", () => {
    const today = dayjs("2025-01-07");
    const label = makeLabel(dayjs("2025-01-08"), dayjs("2025-01-12"));
    const result = isCurrentWeek(label, today, today);
    expect(result).toBe(false);
  });

  it("returns false when today is after range", () => {
    const today = dayjs("2025-01-20");
    const label = makeLabel(dayjs("2025-01-08"), dayjs("2025-01-12"));
    const result = isCurrentWeek(label, today, today);
    expect(result).toBe(false);
  });

  // Cross-year boundary (Dec → Jan)
  it("handles a week spanning from December to January", () => {
    const today = dayjs("2026-01-02");
    const label = makeLabel(dayjs("2025-12-30"), dayjs("2026-01-05"));
    const result = isCurrentWeek(label, dayjs("2025-12-30"), today);
    expect(result).toBe(true);
  });

  // Cross-year boundary but today before
  it("returns false when today is before a cross-year range", () => {
    const today = dayjs("2025-12-28");
    const label = makeLabel(dayjs("2025-12-30"), dayjs("2026-01-05"));
    const result = isCurrentWeek(label, dayjs("2025-12-30"), today);
    expect(result).toBe(false);
  });

  // Cross-year boundary but today after
  it("returns false when today is after a cross-year range", () => {
    const today = dayjs("2026-01-06");
    const label = makeLabel(dayjs("2025-12-30"), dayjs("2026-01-05"));
    const result = isCurrentWeek(label, dayjs("2025-12-30"), today);
    expect(result).toBe(false);
  });

  // Missing dash (invalid format)
  it("returns false for malformed label", () => {
    const today = dayjs("2025-04-10");
    const label = "4.10"; // no dash
    const result = isCurrentWeek(label, today, today);
    expect(result).toBe(false);
  });

  // End month omitted
  it("handles label with no explicit end day", () => {
    const today = dayjs("2025-06-03");
    const label = "6.1 - 7"; // missing month number after dash
    const result = isCurrentWeek(label, today, today);
    expect(result).toBe(true);
  });

  // Leap year range
  it("handles leap year February 29 correctly", () => {
    const today = dayjs("2028-02-29");
    const label = makeLabel(dayjs("2028-02-26"), dayjs("2028-03-03"));
    const result = isCurrentWeek(label, today, today);
    expect(result).toBe(true);
  });

  // Cross-month transition (e.g. June → July)
  it("handles a week that crosses from one month to the next", () => {
    const today = dayjs("2025-07-02");
    const label = makeLabel(dayjs("2025-06-29"), dayjs("2025-07-05"));
    const result = isCurrentWeek(label, dayjs("2025-06-29"), today);
    expect(result).toBe(true);
  });

  // Cross-month transition, today before range
  it("returns false when today is before a cross-month range", () => {
    const today = dayjs("2025-06-27");
    const label = makeLabel(dayjs("2025-06-29"), dayjs("2025-07-05"));
    const result = isCurrentWeek(label, dayjs("2025-06-29"), today);
    expect(result).toBe(false);
  });

  // Cross-month transition, today after range
  it("returns false when today is after a cross-month range", () => {
    const today = dayjs("2025-07-06");
    const label = makeLabel(dayjs("2025-06-29"), dayjs("2025-07-05"));
    const result = isCurrentWeek(label, dayjs("2025-06-29"), today);
    expect(result).toBe(false);
  });
});

describe("getSomedayWeekLabel()", () => {
  it('returns "This Week" when today is inside range', () => {
    const today = dayjs("2025-01-10");
    const label = makeLabel(dayjs("2025-01-08"), dayjs("2025-01-12"));
    expect(getSomedayWeekLabel(label, today, today)).toBe("This Week");
  });

  it("returns original label when today is before range", () => {
    const today = dayjs("2025-01-07");
    const label = makeLabel(dayjs("2025-01-08"), dayjs("2025-01-12"));
    expect(getSomedayWeekLabel(label, today, today)).toBe(label);
  });

  it("returns original label when today is after range", () => {
    const today = dayjs("2025-01-20");
    const label = makeLabel(dayjs("2025-01-08"), dayjs("2025-01-12"));
    expect(getSomedayWeekLabel(label, today, today)).toBe(label);
  });

  it('returns "This Week" for a cross-year week when today is inside', () => {
    const today = dayjs("2026-01-02");
    const label = makeLabel(dayjs("2025-12-30"), dayjs("2026-01-05"));
    expect(getSomedayWeekLabel(label, dayjs("2025-12-30"), today)).toBe(
      "This Week",
    );
  });

  it("returns label for cross-year week when today is outside", () => {
    const today = dayjs("2026-01-06");
    const label = makeLabel(dayjs("2025-12-30"), dayjs("2026-01-05"));
    expect(getSomedayWeekLabel(label, dayjs("2025-12-30"), today)).toBe(label);
  });

  // Cross-month
  it('returns "This Week" for cross-month range when today is inside', () => {
    const today = dayjs("2025-07-02");
    const label = makeLabel(dayjs("2025-06-29"), dayjs("2025-07-05"));
    expect(getSomedayWeekLabel(label, dayjs("2025-06-29"), today)).toBe(
      "This Week",
    );
  });

  it("returns label for cross-month week when today is outside", () => {
    const today = dayjs("2025-07-06");
    const label = makeLabel(dayjs("2025-06-29"), dayjs("2025-07-05"));
    expect(getSomedayWeekLabel(label, dayjs("2025-06-29"), today)).toBe(label);
  });

  // Leap year
  it('returns "This Week" for leap-year week containing February 29', () => {
    const today = dayjs("2028-02-29");
    const viewStart = dayjs("2028-02-26");
    const label = makeLabel(dayjs("2028-02-26"), dayjs("2028-03-03"));
    expect(getSomedayWeekLabel(label, viewStart, today)).toBe("This Week");
  });

  it("returns label when today is outside the leap-year week", () => {
    const today = dayjs("2028-03-05");
    const viewStart = dayjs("2028-02-26");
    const label = makeLabel(dayjs("2028-02-26"), dayjs("2028-03-03"));
    expect(getSomedayWeekLabel(label, viewStart, today)).toBe(label);
  });
});
