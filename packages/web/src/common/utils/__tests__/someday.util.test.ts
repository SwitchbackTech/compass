import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { Schema_SomedayGridEvent } from "@web/common/types/web.event.types";
import { categorizeSomedayEvents } from "../someday.util";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

describe("categorizeSomedayEvents", () => {
  const baseEvent: Partial<Schema_SomedayGridEvent> = {
    _id: "test-id",
    order: 0,
    isSomeday: true,
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
