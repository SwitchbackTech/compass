import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  BusyPeriodSchema,
  EditableRecurrenceSchema,
  EventContentSchema,
  EventRecurrenceSchema,
  EventScheduleSchema,
  EventSchema,
} from "@core/types/event.contracts";

const timedSchedule = {
  kind: "timed",
  start: "2026-07-14T09:00:00-06:00",
  end: "2026-07-14T10:00:00-06:00",
  timeZone: "America/Denver",
};
const allDaySchedule = {
  kind: "allDay",
  start: "2026-07-14",
  end: "2026-07-15",
};

const singleRecurrence = { kind: "single" };
const seriesRecurrence = { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] };

const baseEvent = (overrides: Record<string, unknown> = {}) => ({
  id: faker.database.mongodbObjectId(),
  calendarId: faker.database.mongodbObjectId(),
  content: { kind: "details", title: "Standup", description: "Daily sync" },
  schedule: timedSchedule,
  recurrence: singleRecurrence,
  priority: Priorities.UNASSIGNED,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: null,
  ...overrides,
});

describe("Event Contracts", () => {
  describe("EventContentSchema", () => {
    it("rejects unknown keys on details content", () => {
      const result = EventContentSchema.safeParse({
        kind: "details",
        title: "x",
        description: "y",
        extra: 1,
      });

      expect(result.success).toBe(false);
    });

    it("rejects unknown keys on busy content", () => {
      const result = EventContentSchema.safeParse({ kind: "busy", extra: 1 });

      expect(result.success).toBe(false);
    });
  });

  describe("EventScheduleSchema (timed)", () => {
    it("rejects end equal to start", () => {
      const schedule = { ...timedSchedule, end: timedSchedule.start };
      const result = EventScheduleSchema.safeParse(schedule);

      expect(result.success).toBe(false);
      expect(result.success ? null : result.error.issues[0]?.path).toEqual([
        "end",
      ]);
    });

    it("rejects end before start", () => {
      const schedule = {
        ...timedSchedule,
        start: "2026-07-14T10:00:00-06:00",
        end: "2026-07-14T09:00:00-06:00",
      };

      expect(EventScheduleSchema.safeParse(schedule).success).toBe(false);
    });

    it("rejects unknown keys", () => {
      const schedule = { ...timedSchedule, extra: 1 };

      expect(EventScheduleSchema.safeParse(schedule).success).toBe(false);
    });
  });

  describe("EventScheduleSchema (allDay)", () => {
    it("rejects end equal to start (exclusive end)", () => {
      const schedule = {
        kind: "allDay",
        start: "2026-07-14",
        end: "2026-07-14",
      };
      const result = EventScheduleSchema.safeParse(schedule);

      expect(result.success).toBe(false);
      expect(result.success ? null : result.error.issues[0]?.path).toEqual([
        "end",
      ]);
    });

    it("accepts end one day after start", () => {
      expect(EventScheduleSchema.safeParse(allDaySchedule).success).toBe(true);
    });

    it("accepts a multi-day span", () => {
      const schedule = {
        kind: "allDay",
        start: "2026-07-14",
        end: "2026-07-20",
      };

      expect(EventScheduleSchema.safeParse(schedule).success).toBe(true);
    });

    it("rejects an instant string in place of a date-only value", () => {
      const schedule = {
        kind: "allDay",
        start: "2026-07-14T00:00:00Z",
        end: "2026-07-15",
      };

      expect(EventScheduleSchema.safeParse(schedule).success).toBe(false);
    });

    it("rejects unknown keys", () => {
      const schedule = { ...allDaySchedule, extra: 1 };

      expect(EventScheduleSchema.safeParse(schedule).success).toBe(false);
    });
  });

  describe("EventScheduleSchema (rejects someday)", () => {
    it("rejects a someday schedule now that the kind is removed", () => {
      const schedule = {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-14",
        sortOrder: 0,
      };

      expect(EventScheduleSchema.safeParse(schedule).success).toBe(false);
    });
  });

  describe("EventRecurrenceSchema", () => {
    it("rejects a series with an empty rules array", () => {
      const recurrence = { kind: "series", rules: [] };

      expect(EventRecurrenceSchema.safeParse(recurrence).success).toBe(false);
    });

    it("rejects an occurrence with an invalid seriesId", () => {
      const recurrence = { kind: "occurrence", seriesId: "not-an-id" };

      expect(EventRecurrenceSchema.safeParse(recurrence).success).toBe(false);
    });

    it("accepts an occurrence with a valid seriesId", () => {
      const recurrence = {
        kind: "occurrence",
        seriesId: faker.database.mongodbObjectId(),
      };

      expect(EventRecurrenceSchema.safeParse(recurrence).success).toBe(true);
    });

    it("rejects unknown keys on a single recurrence", () => {
      expect(
        EventRecurrenceSchema.safeParse({ kind: "single", extra: 1 }).success,
      ).toBe(false);
    });

    it("rejects unknown keys on a series recurrence", () => {
      const recurrence = { ...seriesRecurrence, extra: 1 };

      expect(EventRecurrenceSchema.safeParse(recurrence).success).toBe(false);
    });
  });

  describe("EditableRecurrenceSchema", () => {
    it("rejects an occurrence (create/replace never submit a seriesId)", () => {
      const recurrence = {
        kind: "occurrence",
        seriesId: faker.database.mongodbObjectId(),
      };

      expect(EditableRecurrenceSchema.safeParse(recurrence).success).toBe(
        false,
      );
    });
  });

  describe("EventSchema", () => {
    const contents: [string, unknown][] = [
      [
        "details",
        { kind: "details", title: "Standup", description: "Daily sync" },
      ],
      ["busy", { kind: "busy" }],
    ];
    const schedules: [string, unknown][] = [
      ["timed", timedSchedule],
      ["allDay", allDaySchedule],
    ];
    const recurrences: [string, unknown][] = [
      ["single", singleRecurrence],
      ["series", seriesRecurrence],
      [
        "occurrence",
        { kind: "occurrence", seriesId: faker.database.mongodbObjectId() },
      ],
    ];

    for (const [contentName, content] of contents) {
      for (const [scheduleName, schedule] of schedules) {
        for (const [recurrenceName, recurrence] of recurrences) {
          it(`parses content=${contentName} schedule=${scheduleName} recurrence=${recurrenceName}`, () => {
            const event = baseEvent({ content, schedule, recurrence });

            expect(EventSchema.safeParse(event).success).toBe(true);
          });
        }
      }
    }

    it("accepts an empty title and description for details content", () => {
      const event = baseEvent({
        content: { kind: "details", title: "", description: "" },
      });

      expect(EventSchema.safeParse(event).success).toBe(true);
    });

    it("accepts a null updatedAt", () => {
      expect(
        EventSchema.safeParse(baseEvent({ updatedAt: null })).success,
      ).toBe(true);
    });

    it("rejects unknown keys on the event itself", () => {
      const event = baseEvent({ extra: true });

      expect(EventSchema.safeParse(event).success).toBe(false);
    });
  });

  describe("BusyPeriodSchema", () => {
    it("accepts a valid busy period", () => {
      const period = {
        calendarId: faker.database.mongodbObjectId(),
        start: "2026-07-14T09:00:00Z",
        end: "2026-07-14T10:00:00Z",
      };

      expect(BusyPeriodSchema.safeParse(period).success).toBe(true);
    });

    it("rejects end equal to start", () => {
      const period = {
        calendarId: faker.database.mongodbObjectId(),
        start: "2026-07-14T09:00:00Z",
        end: "2026-07-14T09:00:00Z",
      };
      const result = BusyPeriodSchema.safeParse(period);

      expect(result.success).toBe(false);
      expect(result.success ? null : result.error.issues[0]?.path).toEqual([
        "end",
      ]);
    });
  });
});
