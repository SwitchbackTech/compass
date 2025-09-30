import { renderHook } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { useMigrationLogic } from "@web/views/Onboarding/steps/events/MigrationSandbox/useMigrationLogic";

// Mock dayjs to use a fixed date for consistent testing
const mockDate = dayjs("2025-09-10"); // Wednesday, September 10, 2025
jest.mock("@core/util/date/dayjs", () => {
  const { default: originalDayjs } = jest.requireActual(
    "@core/util/date/dayjs",
  );

  const mockDayjs = (date?: unknown) => {
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
    const { result } = renderHook(() => useMigrationLogic());

    expect(result.current.monthTitle).toBe("September 2025");
  });

  it("should return correct week day labels", () => {
    const { result } = renderHook(() => useMigrationLogic());

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
    const { result } = renderHook(() => useMigrationLogic());

    // Find the week that contains the current day (September 10, 2025)
    const currentWeek = result.current.weeks.find((week) =>
      week.days.some((day) => day.isToday),
    );

    expect(currentWeek).toBeDefined();
    expect(currentWeek?.isCurrentWeek).toBe(true);
  });

  it("should highlight all days in current week (Sunday to Saturday)", () => {
    const { result } = renderHook(() => useMigrationLogic());

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
    const { result } = renderHook(() => useMigrationLogic());

    // Find today's date
    const today = result.current.weeks
      .flatMap((week) => week.days)
      .find((day) => day.isToday);

    expect(today).toBeDefined();
    expect(today?.day).toBe(10); // September 10, 2025
    expect(today?.isCurrentMonth).toBe(true);
    expect(today?.isCurrentWeek).toBe(true);
  });

  it("should have correct current week days (September 7-13, 2025)", () => {
    const { result } = renderHook(() => useMigrationLogic());

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
    const { result } = renderHook(() => useMigrationLogic());

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
    const { result } = renderHook(() => useMigrationLogic());

    // Since we're testing with September 10, 2025, the current week should be visible
    expect(result.current.isCurrentWeekVisible).toBe(true);
  });

  it("should have exactly 5 weeks", () => {
    const { result } = renderHook(() => useMigrationLogic());

    expect(result.current.weeks).toHaveLength(5);
  });

  it("should have exactly 7 days per week", () => {
    const { result } = renderHook(() => useMigrationLogic());

    result.current.weeks.forEach((week) => {
      expect(week.days).toHaveLength(7);
    });
  });

  it("should correctly calculate currentWeekIndex", () => {
    const { result } = renderHook(() => useMigrationLogic());

    // Since we're using September 10, 2025 (Wednesday), currentWeekIndex should be valid
    expect(result.current.currentWeekIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.currentWeekIndex).toBeLessThan(5);

    // The week at currentWeekIndex should contain today
    const currentWeek = result.current.weeks[result.current.currentWeekIndex];
    expect(currentWeek.isCurrentWeek).toBe(true);
    expect(currentWeek.days.some((day) => day.isToday)).toBe(true);
  });

  it("should have Saturday (day 13) as the last day of the current week", () => {
    const { result } = renderHook(() => useMigrationLogic());

    // Find the current week
    const currentWeek = result.current.weeks[result.current.currentWeekIndex];
    expect(currentWeek.isCurrentWeek).toBe(true);

    // Saturday should be the last day (index 6) of the current week
    const saturdayDay = currentWeek.days[6]; // Saturday is index 6
    expect(saturdayDay.isCurrentWeek).toBe(true);
    expect(saturdayDay.day).toBe(13); // September 13, 2025 is the Saturday of the week containing September 10
    expect(saturdayDay.isCurrentMonth).toBe(true);
  });

  it("should provide correct week structure for arrow targeting", () => {
    const { result } = renderHook(() => useMigrationLogic());

    // Verify that each week has 7 days (Sunday to Saturday)
    result.current.weeks.forEach((week) => {
      expect(week.days).toHaveLength(7);
      // First day should be Sunday (index 0), last should be Saturday (index 6)
    });

    // The current week should be identifiable
    const currentWeek = result.current.weeks[result.current.currentWeekIndex];
    expect(currentWeek).toBeDefined();
    expect(currentWeek.isCurrentWeek).toBe(true);

    // Saturday of current week should be at index 6
    const saturday = currentWeek.days[6];
    expect(saturday.isCurrentWeek).toBe(true);
  });
});
