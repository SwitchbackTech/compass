import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  computeCurrentEventDateRange,
  computeRelativeEventDateRange,
  getCalendarHeadingLabel,
  getWeekRangeLabel,
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
