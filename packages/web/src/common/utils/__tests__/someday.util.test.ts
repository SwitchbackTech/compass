import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { Schema_SomedayEvent } from "@web/common/types/web.event.types";
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
