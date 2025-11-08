import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { arraysAreEqual } from "@web/__tests__/utils/web.test.util";
import {
  computeCurrentEventDateRange,
  computeRelativeEventDateRange,
  getCalendarHeadingLabel,
  getColorsByHour,
  getHourLabels,
  getWeekRangeLabel,
  toUTCOffset,
} from "@web/common/utils/datetime/web.date.util";

describe("computeRelativeEventDateRange", () => {
  const baseEvent: Schema_Event = {
    _id: "test-id",
    startDate: "2024-03-19", // A Tuesday
    endDate: "2024-03-20",
  };

  // Helper function to format dates to YYYY-MM-DD
  const formatDate = (date: string | undefined) =>
    dayjs(date as string).format(YEAR_MONTH_DAY_FORMAT);

  // Set up fake timers
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-03-15")); // A Friday
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  describe("Week duration", () => {
    it("should set previous week dates", () => {
      const result = computeRelativeEventDateRange(
        { direction: "prev", duration: "week" },
        baseEvent,
      );

      expect(formatDate(result.startDate)).toBe("2024-03-10");
      expect(formatDate(result.endDate)).toBe("2024-03-16");
    });

    it("should set next week dates", () => {
      const result = computeRelativeEventDateRange(
        { direction: "next", duration: "week" },
        baseEvent,
      );

      expect(formatDate(result.startDate)).toBe("2024-03-24");
      expect(formatDate(result.endDate)).toBe("2024-03-30");
    });
  });

  describe("Month duration", () => {
    it("should set previous month dates", () => {
      const result = computeRelativeEventDateRange(
        { direction: "prev", duration: "month" },
        baseEvent,
      );

      expect(formatDate(result.startDate)).toBe("2024-02-01");
      expect(formatDate(result.endDate)).toBe("2024-02-29");
    });

    it("should set next month dates", () => {
      const result = computeRelativeEventDateRange(
        { direction: "next", duration: "month" },
        baseEvent,
      );

      expect(formatDate(result.startDate)).toBe("2024-04-01");
      expect(formatDate(result.endDate)).toBe("2024-04-30");
    });
  });

  describe("Edge cases", () => {
    it("should handle month transitions correctly", () => {
      const eventAtMonthEnd = {
        ...baseEvent,
        startDate: "2024-03-31", // Last day of March
        endDate: "2024-03-31",
      };

      const result = computeRelativeEventDateRange(
        { direction: "next", duration: "month" },
        eventAtMonthEnd,
      );

      expect(formatDate(result.startDate)).toBe("2024-04-01");
      expect(formatDate(result.endDate)).toBe("2024-04-30");
    });

    it("should handle week transitions across months", () => {
      const eventAtMonthTransition = {
        ...baseEvent,
        startDate: "2024-03-31", // Sunday, last day of March
        endDate: "2024-03-31",
      };

      const result = computeRelativeEventDateRange(
        { direction: "next", duration: "week" },
        eventAtMonthTransition,
      );

      expect(formatDate(result.startDate)).toBe("2024-04-07");
      expect(formatDate(result.endDate)).toBe("2024-04-13");
    });
  });
});

describe("computeCurrentEventDateRange", () => {
  const baseEvent: Schema_Event = {
    _id: "test-id",
    startDate: "2024-03-19", // A Tuesday
    endDate: "2024-03-20",
  };

  // Helper function to format dates to YYYY-MM-DD
  const formatDate = (date: string | undefined) =>
    dayjs(date as string).format(YEAR_MONTH_DAY_FORMAT);

  // Set up fake timers
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-03-15")); // A Friday
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("Week duration", () => {
    it("should use exact week range provided", () => {
      const weekViewRange = {
        startDate: "2024-06-30",
        endDate: "2024-07-06",
      };

      const result = computeCurrentEventDateRange(
        { duration: "week" },
        baseEvent,
        weekViewRange,
      );

      expect(formatDate(result.startDate)).toBe("2024-06-30");
      expect(formatDate(result.endDate)).toBe("2024-07-06");
    });
  });

  describe("Month duration", () => {
    it("should set current month dates", () => {
      const weekViewRange = {
        startDate: "2024-06-30",
        endDate: "2024-07-06",
      };

      const result = computeCurrentEventDateRange(
        { duration: "month" },
        baseEvent,
        weekViewRange,
      );

      expect(formatDate(result.startDate)).toBe("2024-06-01");
      expect(formatDate(result.endDate)).toBe("2024-06-30");
    });
  });

  describe("Edge cases", () => {
    it("should preserve other event properties", () => {
      const eventWithProps = {
        ...baseEvent,
        title: "Test Event",
        description: "Test Description",
        isAllDay: true,
      };

      const weekViewRange = {
        startDate: "2024-06-30",
        endDate: "2024-07-06",
      };

      const result = computeCurrentEventDateRange(
        { duration: "week" },
        eventWithProps,
        weekViewRange,
      );

      expect(formatDate(result.startDate)).toBe("2024-06-30");
      expect(formatDate(result.endDate)).toBe("2024-07-06");
      expect(result.title).toBe(eventWithProps.title);
      expect(result.description).toBe(eventWithProps.description);
      expect(result.isAllDay).toBe(eventWithProps.isAllDay);
    });
  });
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
    it("should return month and year", () => {
      const today = dayjs("2024-12-30");
      const weekInViewStart = dayjs("2025-01-05");
      const weekInViewEnd = dayjs("2025-01-11");
      const label = getCalendarHeadingLabel(
        weekInViewStart,
        weekInViewEnd,
        today,
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
        today,
      );
      const expectedlabel = "Dec 24 - Jan 25";
      expect(label).toBe(expectedlabel);
    });
  });
});

const getColorTotals = (colors) => {
  const uniqueColors = Array.from(new Set(colors));

  const color1 = colors.filter((c) => c === uniqueColors[0]);
  const color2 = colors.filter((c) => c === uniqueColors[1]);
  const colorTotals = [color1.length, color2.length];
  return colorTotals;
};

describe("getHourLabels", () => {
  it("has 23 intervals)", () => {
    // 23 to prevent duplicates from 11pm-midnight
    const dayTimes = getHourLabels();
    expect(dayTimes).toHaveLength(23);
  });
});

describe("getColorsByHour", () => {
  it("has 24 intervals", () => {
    const colors = getColorsByHour(dayjs().hour());
    expect(colors).toHaveLength(24);
  });

  it("uses two colors", () => {
    const colors = getColorsByHour(20);
    expect(new Set(colors).size).toBe(2);
  });

  it("only highlights one hour (noon)", () => {
    const colors = getColorsByHour(12);
    const colorTotals = getColorTotals(colors);
    expect(colorTotals).toContain(23);
    expect(colorTotals).toContain(1);
  });

  it("doesn't highlight any when midnight hour", () => {
    const colors = getColorsByHour(0);
    const colorTotals = getColorTotals(colors);
    expect(colorTotals).toEqual([24, 0]);
  });

  it("returns same order for minute 0 to 59", () => {
    const day1 = dayjs("2022-04-04T00:00:00.000Z");
    const day2 = dayjs("2022-04-04T00:59:00.000Z");
    const day1Colors = getColorsByHour(day1);
    const day2Colors = getColorsByHour(day2);

    const sameOrder = arraysAreEqual(day1Colors, day2Colors);
    expect(sameOrder).toBe(true);
  });

  it("changes at the top of the hour", () => {
    const day1 = dayjs("2022-04-04T23:59:59.000Z").hour();
    const day2 = dayjs("2022-04-05T00:00:00.000Z").hour();
    const day1Colors = getColorsByHour(day1);
    const day2Colors = getColorsByHour(day2);

    const sameOrder = arraysAreEqual(day1Colors, day2Colors);
    expect(sameOrder).toBe(false);
  });
});

describe("toUTCOffset", () => {
  const validateResult = (result) => {
    const offsetChar = result.slice(-6, -5);
    const hasOffsetChar = offsetChar === "+" || offsetChar === "-";
    expect(hasOffsetChar).toBe(true);

    // Z is used for pure UTC timestamps (which don't use an offset)
    expect(result.slice(-1)).not.toEqual("Z");
  };
  it("includes a TZ offset - when passing str with times", () => {
    const result = toUTCOffset("2022-01-01 10:00");
    validateResult(result);
  });
  it("includes a TZ offset - when passing string YYYY-MM (no times) ", () => {
    const result = toUTCOffset("2022-05-21");
    validateResult(result);
  });

  it("includes a TZ offset - when passing Date object", () => {
    const result = toUTCOffset(new Date());
    validateResult(result);
  });

  it("includes a TZ offset - when passing a dayjs object", () => {
    const d = dayjs();
    const resultFromDayJsObj = toUTCOffset(d);
    validateResult(resultFromDayJsObj);
  });
});
