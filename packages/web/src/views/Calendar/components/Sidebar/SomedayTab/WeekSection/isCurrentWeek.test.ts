import { isCurrentWeek } from "./isCurrentWeek.tsx";

describe("isCurrentWeek", () => {
  const viewStart = String(new Date("2025-10-01").getTime());

  it("returns true when today is inside the range", () => {
    const today = new Date("2025-10-15");
    const label = "10.13 - 10.19";
    expect(isCurrentWeek(label, viewStart, today)).toBe(true);
  });

  it("returns false when today is before the range", () => {
    const today = new Date("2025-10-10");
    const label = "10.13 - 10.19";
    expect(isCurrentWeek(label, viewStart, today)).toBe(false);
  });

  it("returns false when today is after the range", () => {
    const today = new Date("2025-10-25");
    const label = "10.13 - 10.19";
    expect(isCurrentWeek(label, viewStart, today)).toBe(false);
  });

  it("handles same start and end date correctly", () => {
    const today = new Date("2025-11-05");
    const label = "11.05"; // single-day range
    expect(isCurrentWeek(label, viewStart, today)).toBe(true);
  });

  it("returns false for single-day label not matching today", () => {
    const today = new Date("2025-11-06");
    const label = "11.05";
    expect(isCurrentWeek(label, viewStart, today)).toBe(false);
  });

  it("handles end-of-year transition correctly", () => {
    const today = new Date("2026-01-01");
    const label = "12.30 - 01.05"; // week crossing into new year
    const viewStartDec = String(new Date("2025-12-01").getTime());
    expect(isCurrentWeek(label, viewStartDec, today)).toBe(true);
  });

  it("returns false when today is before year-crossing range", () => {
    const today = new Date("2025-12-28");
    const label = "12.30 - 01.05";
    const viewStartDec = String(new Date("2025-12-01").getTime());
    expect(isCurrentWeek(label, viewStartDec, today)).toBe(false);
  });

  it("returns false when today is after year-crossing range", () => {
    const today = new Date("2026-01-06");
    const label = "12.30 - 01.05";
    const viewStartDec = String(new Date("2025-12-01").getTime());
    expect(isCurrentWeek(label, viewStartDec, today)).toBe(false);
  });
});
