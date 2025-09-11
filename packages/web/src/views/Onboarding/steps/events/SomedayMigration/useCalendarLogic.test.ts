import dayjs from "dayjs";
import { renderHook } from "@testing-library/react";
import { useCalendarLogic } from "./useCalendarLogic";

// Mock dayjs to use a fixed date for consistent testing
const mockDate = dayjs("2024-01-11"); // Thursday, January 11, 2024
jest.mock("dayjs", () => {
  const originalDayjs = jest.requireActual("dayjs");
  const mockDayjs = (date?: any) => {
    if (date === undefined) {
      return originalDayjs(mockDate);
    }
    return originalDayjs(date);
  };
  Object.assign(mockDayjs, originalDayjs);
  return mockDayjs;
});

describe("useCalendarLogic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return correct month title", () => {
    const { result } = renderHook(() => useCalendarLogic());

    expect(result.current.monthTitle).toBe("January 2024");
  });

  it("should return correct week day labels", () => {
    const { result } = renderHook(() => useCalendarLogic());

    expect(result.current.weekDays).toEqual([
      "S",
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
    ]);
  });

  it("should identify current week correctly", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Find the week that contains the current day (January 11, 2024)
    const currentWeek = result.current.weeks.find((week) =>
      week.days.some((day) => day.isToday),
    );

    expect(currentWeek).toBeDefined();
    expect(currentWeek?.isCurrentWeek).toBe(true);
  });

  it("should highlight all days in current week (Sunday to Saturday)", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Find the current week
    const currentWeek = result.current.weeks.find((week) =>
      week.days.some((day) => day.isToday),
    );

    expect(currentWeek).toBeDefined();

    // All days in the current week should be highlighted
    currentWeek?.days.forEach((day) => {
      expect(day.isCurrentWeek).toBe(true);
    });
  });

  it("should identify today correctly", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Find today's date
    const today = result.current.weeks
      .flatMap((week) => week.days)
      .find((day) => day.isToday);

    expect(today).toBeDefined();
    expect(today?.day).toBe(11); // January 11, 2024
    expect(today?.isCurrentMonth).toBe(true);
    expect(today?.isCurrentWeek).toBe(true);
  });

  it("should have correct current week days (January 7-13, 2024)", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Find the current week
    const currentWeek = result.current.weeks.find((week) =>
      week.days.some((day) => day.isToday),
    );

    expect(currentWeek).toBeDefined();

    // The current week should contain days 7-13
    const currentWeekDays = currentWeek?.days
      .filter((day) => day.isCurrentMonth)
      .map((day) => day.day)
      .sort((a, b) => a - b);

    expect(currentWeekDays).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it("should mark non-current month days correctly", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Find days that are not in the current month
    const nonCurrentMonthDays = result.current.weeks
      .flatMap((week) => week.days)
      .filter((day) => !day.isCurrentMonth);

    // All non-current month days should not be in current week
    nonCurrentMonthDays.forEach((day) => {
      expect(day.isCurrentWeek).toBe(false);
    });
  });

  it("should have correct isCurrentWeekVisible value", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Since we're testing with January 11, 2024, the current week should be visible
    expect(result.current.isCurrentWeekVisible).toBe(true);
  });

  it("should have exactly 5 weeks", () => {
    const { result } = renderHook(() => useCalendarLogic());

    expect(result.current.weeks).toHaveLength(5);
  });

  it("should have exactly 7 days per week", () => {
    const { result } = renderHook(() => useCalendarLogic());

    result.current.weeks.forEach((week) => {
      expect(week.days).toHaveLength(7);
    });
  });

  it("should correctly calculate currentWeekIndex", () => {
    const { result } = renderHook(() => useCalendarLogic());

    // Since we're using January 11, 2024 (Thursday), currentWeekIndex should be valid
    expect(result.current.currentWeekIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.currentWeekIndex).toBeLessThan(5);

    // The week at currentWeekIndex should contain today
    const currentWeek = result.current.weeks[result.current.currentWeekIndex];
    expect(currentWeek.isCurrentWeek).toBe(true);
    expect(currentWeek.days.some((day) => day.isToday)).toBe(true);
  });
});
