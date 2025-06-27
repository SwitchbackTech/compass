import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Origin, Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { Schema_SomedayEvent } from "@web/common/types/web.event.types";
import { computeRelativeEventDateRange } from "@web/common/utils/web.date.util";
import { computeCurrentEventDateRange } from "@web/common/utils/web.date.util";
import { categorizeSomedayEvents } from "../someday.util";
import { setSomedayEventsOrder } from "../someday.util";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

describe("categorizeSomedayEvents", () => {
  const baseEvent: Partial<Schema_SomedayEvent> = {
    title: "test-title",
    description: "test-description",
    isAllDay: false,
    origin: Origin.COMPASS,
    _id: "test-id",
    order: 0,
    isSomeday: true,
    user: "test-user",
    priority: Priorities.UNASSIGNED,
    startDate: "2024-03-19",
    endDate: "2024-03-20",
  };

  const weekDates = {
    start: dayjs("2024-03-17"),
    end: dayjs("2024-03-23"),
  };

  describe("Week vs Month categorization", () => {
    it("should categorize event within current week to week column", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-19",
          endDate: "2024-03-20",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toContain("event-1");
      expect(result.columns[COLUMN_MONTH].eventIds).not.toContain("event-1");
    });

    it("should categorize event outside current week but within month to month column", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-25", // Next week but same month
          endDate: "2024-03-26",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain("event-1");
      expect(result.columns[COLUMN_WEEK].eventIds).not.toContain("event-1");
    });

    it("should categorize month event to month column", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-01",
          endDate: "2024-03-31",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain("event-1");
      expect(result.columns[COLUMN_WEEK].eventIds).not.toContain("event-1");
    });

    it("should categorize week event to week column and month event to month column", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-17",
          endDate: "2024-03-23",
        },
        "event-2": {
          ...baseEvent,
          _id: "event-2",
          startDate: "2024-03-01",
          endDate: "2024-03-31",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain("event-2");
      expect(result.columns[COLUMN_WEEK].eventIds).toContain("event-1");
    });

    it("should not categorize events outside current month", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-04-01",
          endDate: "2024-04-02",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).not.toContain("event-1");
      expect(result.columns[COLUMN_WEEK].eventIds).not.toContain("event-1");
    });
  });

  describe("Event Sorting", () => {
    it("should maintain event order based on order property", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          order: 2,
        },
        "event-2": {
          ...baseEvent,
          _id: "event-2",
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          order: 1,
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toEqual([
        "event-2",
        "event-1",
      ]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle events exactly at week boundaries", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-17", // Monday (week start)
          endDate: "2024-03-23", // Sunday (week end)
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toContain("event-1");
    });

    it("should handle events exactly at month boundaries", () => {
      const events = {
        "event-1": {
          ...baseEvent,
          _id: "event-1",
          startDate: "2024-03-01", // Month start
          endDate: "2024-03-31", // Month end
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain("event-1");
    });

    it("should handle empty events object", () => {
      const result = categorizeSomedayEvents({}, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toEqual([]);
      expect(result.columns[COLUMN_MONTH].eventIds).toEqual([]);
      expect(result.columnOrder).toEqual([COLUMN_WEEK, COLUMN_MONTH]);
    });
  });
});

describe("setSomedayEventsOrder", () => {
  const createEvent = (id: string, order?: number): Schema_Event => ({
    _id: id,
    ...(order !== undefined && { order }),
  });

  it("should return empty array for empty input", () => {
    expect(setSomedayEventsOrder([])).toEqual([]);
  });

  it("should assign sequential orders starting from 0 when no events have orders", () => {
    const events = [createEvent("1"), createEvent("2"), createEvent("3")];

    const result = setSomedayEventsOrder(events);

    expect(result).toEqual([
      { ...events[0], order: 0 },
      { ...events[1], order: 1 },
      { ...events[2], order: 2 },
    ]);
  });

  it("should preserve existing valid orders", () => {
    const events = [
      createEvent("1", 5),
      createEvent("2", 2),
      createEvent("3", 8),
    ];

    const result = setSomedayEventsOrder(events);

    expect(result).toEqual(events);
  });

  it("should fill gaps in order sequence", () => {
    const events = [
      createEvent("1", 0),
      createEvent("2"), // Should get order 1
      createEvent("3", 3),
      createEvent("4"), // Should get order 2
      createEvent("5", 5),
    ];

    const result = setSomedayEventsOrder(events);

    expect(result).toEqual([
      { ...events[0], order: 0 },
      { ...events[1], order: 1 },
      { ...events[2], order: 3 },
      { ...events[3], order: 2 },
      { ...events[4], order: 5 },
    ]);
  });

  it("should append to end when no gaps available", () => {
    const events = [
      createEvent("1", 0),
      createEvent("2", 1),
      createEvent("3"), // Should get order 3
      createEvent("4", 2),
      createEvent("5"), // Should get order 4
    ];

    const result = setSomedayEventsOrder(events);

    expect(result).toEqual([
      { ...events[0], order: 0 },
      { ...events[1], order: 1 },
      { ...events[2], order: 3 },
      { ...events[3], order: 2 },
      { ...events[4], order: 4 },
    ]);
  });

  it("should handle mix of valid and invalid order values", () => {
    const events = [
      createEvent("1", 1),
      { ...createEvent("2"), order: Number.NaN }, // Should get order 0
      { ...createEvent("3"), order: undefined }, // Should get order 2
      createEvent("4", 4),
      { ...createEvent("5"), order: undefined }, // Should get order 3
    ];

    const result = setSomedayEventsOrder(events);

    expect(result).toEqual([
      { ...events[0], order: 1 },
      { ...events[1], order: 0 },
      { ...events[2], order: 2 },
      { ...events[3], order: 4 },
      { ...events[4], order: 3 },
    ]);
  });

  it("should handle single event without order", () => {
    const events = [createEvent("1")];

    const result = setSomedayEventsOrder(events);

    expect(result).toEqual([{ ...events[0], order: 0 }]);
  });
});

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
});
