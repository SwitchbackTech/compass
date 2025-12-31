import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import {
  Origin,
  Priorities,
  RRULE,
  RRULE_COUNT_WEEKS,
} from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  createMockBaseEvent,
  createMockInstances,
} from "@core/util/test/ccal.event.factory";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  Schema_SomedayEvent,
  Schema_SomedayEventsColumn,
} from "@web/common/types/web.event.types";
import {
  categorizeSomedayEvents,
  setSomedayEventsOrder,
} from "@web/common/utils/event/someday.event.util";

describe("categorizeSomedayEvents", () => {
  const baseEvent: Partial<Omit<Schema_SomedayEvent, "recurrence">> = {
    title: "test-title",
    description: "test-description",
    isAllDay: false,
    origin: Origin.COMPASS,
    _id: new ObjectId().toString(),
    order: 0,
    isSomeday: true,
    user: "test-user",
    priority: Priorities.UNASSIGNED,
    startDate: "2024-03-19",
    endDate: "2024-03-20",
  };

  const startOfWeek = dayjs("2024-03-17").startOf("week");
  const weekDates = { start: startOfWeek, end: startOfWeek.endOf("week") };

  describe("Week vs Month categorization", () => {
    it("should categorize event within current week to week column", () => {
      const _id = new ObjectId().toString();

      const events = {
        [_id]: {
          ...baseEvent,
          _id,
          startDate: "2024-03-19",
          endDate: "2024-03-20",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toContain(_id);
      expect(result.columns[COLUMN_MONTH].eventIds).not.toContain(_id);
    });

    it("should categorize event outside current week but within month to month column", () => {
      const _id = new ObjectId().toString();

      const events = {
        [_id]: {
          ...baseEvent,
          _id,
          startDate: "2024-03-25", // Next week but same month
          endDate: "2024-03-26",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain(_id);
      expect(result.columns[COLUMN_WEEK].eventIds).not.toContain(_id);
    });

    it("should categorize month event to month column", () => {
      const _id = new ObjectId().toString();

      const events = {
        [_id]: {
          ...baseEvent,
          _id,
          startDate: "2024-03-01",
          endDate: "2024-03-31",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain(_id);
      expect(result.columns[COLUMN_WEEK].eventIds).not.toContain(_id);
    });

    it("should categorize week event to week column and month event to month column", () => {
      const _idA = new ObjectId().toString();
      const _idB = new ObjectId().toString();

      const events = {
        [_idA]: {
          ...baseEvent,
          _id: _idA,
          startDate: "2024-03-17",
          endDate: "2024-03-17",
        },
        [_idB]: {
          ...baseEvent,
          _id: _idB,
          startDate: "2024-03-01",
          endDate: "2024-03-01",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain(_idB);
      expect(result.columns[COLUMN_WEEK].eventIds).toContain(_idA);
    });

    it("should not categorize events outside current month", () => {
      const _id = new ObjectId().toString();

      const events = {
        [_id]: {
          ...baseEvent,
          _id: new ObjectId().toString(),
          startDate: "2024-04-01",
          endDate: "2024-04-02",
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).not.toContain(_id);
      expect(result.columns[COLUMN_WEEK].eventIds).not.toContain(_id);
    });
  });

  describe("Event Sorting", () => {
    it("should maintain event order based on order property", () => {
      const _idA = new ObjectId().toString();
      const _idB = new ObjectId().toString();

      const events = {
        [_idA]: {
          ...baseEvent,
          _id: _idA,
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          order: 2,
        },
        [_idB]: {
          ...baseEvent,
          _id: _idB,
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          order: 1,
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toEqual([_idB, _idA]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle events exactly at week boundaries", () => {
      const _id = new ObjectId().toString();

      const events = {
        [_id]: {
          ...baseEvent,
          _id,
          startDate: "2024-03-17", // Monday (week start)
          endDate: "2024-03-23", // Sunday (week end)
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toContain(_id);
    });

    it("should handle events exactly at month boundaries", () => {
      const _id = new ObjectId().toString();

      const events = {
        [_id]: {
          ...baseEvent,
          _id,
          startDate: "2024-03-01", // Month start
          endDate: "2024-03-31", // Month end
        },
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_MONTH].eventIds).toContain(_id);
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

  // Set up fake timers
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-03-15")); // A Friday
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("Event IDs", () => {
    it("should handle events with IDs", () => {
      const eventId = new ObjectId().toString();
      // Add all required properties for Schema_SomedayEvent
      const events = {
        [eventId]: {
          ...baseEvent,
          _id: eventId,
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
          order: 0,
        },
      };

      const weekDates = {
        start: dayjs("2024-03-17"),
        end: dayjs("2024-03-23"),
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toContain(eventId);
      expect(result.columns[COLUMN_MONTH].eventIds).not.toContain(eventId);
      expect(result.columnOrder).toEqual([COLUMN_WEEK, COLUMN_MONTH]);
    });

    it("should maintain order for events with IDs", () => {
      const eventIdA = new ObjectId().toString();
      const eventIdB = new ObjectId().toString();

      // Add all required properties for Schema_SomedayEvent
      const events = {
        [eventIdA]: {
          ...baseEvent,
          _id: eventIdA,
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          order: 2,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        },
        [eventIdB]: {
          ...baseEvent,
          _id: eventIdB,
          startDate: "2024-03-19",
          endDate: "2024-03-20",
          order: 1,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        },
      };

      const weekDates = {
        start: dayjs("2024-03-17"),
        end: dayjs("2024-03-23"),
      };

      const result = categorizeSomedayEvents(events, weekDates);

      expect(result.columns[COLUMN_WEEK].eventIds).toEqual([
        eventIdB,
        eventIdA,
      ]);
    });

    it("should assign sequential orders for events without order", () => {
      const eventIdA = new ObjectId().toString();
      const eventIdB = new ObjectId().toString();
      // Add all required properties for Schema_Event
      const events = [
        {
          ...baseEvent,
          _id: eventIdA,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        },
        {
          ...baseEvent,
          _id: eventIdB,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        },
      ];

      const result = setSomedayEventsOrder(events as Schema_Event[]);

      expect(result).toEqual([
        { ...events[0], order: 0 },
        { ...events[1], order: 1 },
      ]);
    });

    it("should fill gaps in order sequence for events", () => {
      const eventIdA = new ObjectId().toString();
      const eventIdB = new ObjectId().toString();
      const eventIdC = new ObjectId().toString();
      // Add all required properties for Schema_Event
      const events = [
        {
          ...baseEvent,
          _id: eventIdA,
          order: 0,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        },
        {
          ...baseEvent,
          _id: eventIdB,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        }, // Should get order 1
        {
          ...baseEvent,
          _id: eventIdC,
          order: 3,
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "test-user",
        },
      ];

      const result = setSomedayEventsOrder(events as Schema_Event[]);

      expect(result).toEqual([
        { ...events[0], order: 0 },
        { ...events[1], order: 1 },
        { ...events[2], order: 3 },
      ]);
    });

    // Recurrence deduplication tests
    it("should not duplicate a recurring event into the month column when a week occurrence exists", () => {
      const isSomeday = true;
      const referenceDate = dayjs(faker.date.anytime());
      const startDate = referenceDate.toRFC3339OffsetString();
      const week = faker.number.int({ min: 0, max: RRULE_COUNT_WEEKS - 1 });
      const startOfWeek = referenceDate.startOf("week").add(week, "weeks");
      const endOfWeek = startOfWeek.endOf("week");
      const weekDates = { start: startOfWeek, end: endOfWeek };
      const recurrence = { rule: [RRULE.WEEK] };
      const base = createMockBaseEvent({ recurrence, startDate, isSomeday });
      const instances = createMockInstances(base, RRULE_COUNT_WEEKS, {
        isSomeday,
        order: 0,
      });

      const events: Schema_SomedayEventsColumn["events"] = instances.reduce(
        (acc, instance) => ({
          ...acc,
          [instance._id]: {
            ...instance,
            recurrence: { ...recurrence, ...instance.recurrence },
          },
        }),
        {},
      );

      const result = categorizeSomedayEvents(events, weekDates);
      const weekOccurrenceId = instances[week]._id;

      expect(result.columns[COLUMN_MONTH].eventIds).toHaveLength(0);
      expect(result.columns[COLUMN_WEEK].eventIds).toContain(weekOccurrenceId);
    });
  });
});
