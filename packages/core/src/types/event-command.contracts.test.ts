import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  AvailabilityQuerySchema,
  CreateEventInputSchema,
  DeleteEventInputSchema,
  EventListQuerySchema,
  EventListResponseSchema,
  EventMutationErrorSchema,
  ReorderEventsInputSchema,
  ReplaceEventInputSchema,
  TransitionEventInputSchema,
} from "@core/types/event-command.contracts";

const calendarId = () => faker.database.mongodbObjectId();
const eventId = () => faker.database.mongodbObjectId();

const content = { kind: "details", title: "Standup", description: "" };
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
const somedaySchedule = {
  kind: "someday",
  period: "week",
  anchorDate: "2026-07-14",
  sortOrder: 0,
};

describe("Event Command Contracts", () => {
  describe("CreateEventInputSchema", () => {
    const base = () => ({
      calendarId: calendarId(),
      content,
      schedule: timedSchedule,
      recurrence: { kind: "single" },
      priority: Priorities.UNASSIGNED,
    });

    it("parses without an id", () => {
      expect(CreateEventInputSchema.safeParse(base()).success).toBe(true);
    });

    it("parses with an optional client-generated id", () => {
      const input = { ...base(), id: eventId() };

      expect(CreateEventInputSchema.safeParse(input).success).toBe(true);
    });

    it("rejects an occurrence recurrence", () => {
      const input = {
        ...base(),
        recurrence: { kind: "occurrence", seriesId: eventId() },
      };

      expect(CreateEventInputSchema.safeParse(input).success).toBe(false);
    });

    it("rejects provider fields", () => {
      const input = {
        ...base(),
        externalReference: {
          provider: "google",
          eventId: "abc",
          recurringEventId: null,
        },
      };

      expect(CreateEventInputSchema.safeParse(input).success).toBe(false);
    });

    it("rejects unknown keys", () => {
      const input = { ...base(), extra: true };

      expect(CreateEventInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("ReplaceEventInputSchema", () => {
    const base = (overrides: Record<string, unknown> = {}) => ({
      content,
      schedule: timedSchedule,
      recurrence: { kind: "preserve" },
      priority: Priorities.WORK,
      scope: "this",
      ...overrides,
    });

    it("accepts a preserve recurrence edit", () => {
      expect(ReplaceEventInputSchema.safeParse(base()).success).toBe(true);
    });

    it("accepts a single recurrence edit", () => {
      const input = base({ recurrence: { kind: "single" } });

      expect(ReplaceEventInputSchema.safeParse(input).success).toBe(true);
    });

    it("accepts a series recurrence edit", () => {
      const input = base({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      });

      expect(ReplaceEventInputSchema.safeParse(input).success).toBe(true);
    });

    it("accepts every recurrence scope value", () => {
      for (const scope of ["this", "thisAndFollowing", "all"] as const) {
        expect(ReplaceEventInputSchema.safeParse(base({ scope })).success).toBe(
          true,
        );
      }
    });

    it("rejects an unknown scope", () => {
      const input = base({ scope: "future" });

      expect(ReplaceEventInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("DeleteEventInputSchema", () => {
    it("accepts a valid scope", () => {
      expect(DeleteEventInputSchema.safeParse({ scope: "all" }).success).toBe(
        true,
      );
    });

    it("rejects an unknown scope", () => {
      expect(
        DeleteEventInputSchema.safeParse({ scope: "future" }).success,
      ).toBe(false);
    });

    it("rejects unknown keys", () => {
      const result = DeleteEventInputSchema.safeParse({
        scope: "all",
        extra: 1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("ReorderEventsInputSchema", () => {
    it("accepts unique ordered items", () => {
      const input = {
        period: "week",
        items: [
          { eventId: eventId(), sortOrder: 0 },
          { eventId: eventId(), sortOrder: 1 },
        ],
      };

      expect(ReorderEventsInputSchema.safeParse(input).success).toBe(true);
    });

    it("rejects duplicate event ids", () => {
      const id = eventId();
      const input = {
        period: "week",
        items: [
          { eventId: id, sortOrder: 0 },
          { eventId: id, sortOrder: 1 },
        ],
      };

      expect(ReorderEventsInputSchema.safeParse(input).success).toBe(false);
    });

    it("rejects an empty items array", () => {
      const input = { period: "week", items: [] };

      expect(ReorderEventsInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("TransitionEventInputSchema", () => {
    it("parses a schedule transition onto a timed target", () => {
      const input = {
        kind: "schedule",
        targetCalendarId: calendarId(),
        schedule: timedSchedule,
      };

      expect(TransitionEventInputSchema.safeParse(input).success).toBe(true);
    });

    it("parses a schedule transition onto an allDay target", () => {
      const input = {
        kind: "schedule",
        targetCalendarId: calendarId(),
        schedule: allDaySchedule,
      };

      expect(TransitionEventInputSchema.safeParse(input).success).toBe(true);
    });

    it("rejects a someday schedule on the schedule branch", () => {
      const input = {
        kind: "schedule",
        targetCalendarId: calendarId(),
        schedule: somedaySchedule,
      };

      expect(TransitionEventInputSchema.safeParse(input).success).toBe(false);
    });

    it("parses an unschedule transition with a someday schedule", () => {
      const input = { kind: "unschedule", schedule: somedaySchedule };

      expect(TransitionEventInputSchema.safeParse(input).success).toBe(true);
    });

    it("rejects unknown keys", () => {
      const input = {
        kind: "unschedule",
        schedule: somedaySchedule,
        extra: 1,
      };

      expect(TransitionEventInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("EventListQuerySchema", () => {
    it("parses a range query", () => {
      const query = {
        kind: "range",
        start: "2026-07-14T00:00:00Z",
        end: "2026-07-21T00:00:00Z",
        priorities: [Priorities.WORK],
      };

      expect(EventListQuerySchema.safeParse(query).success).toBe(true);
    });

    it("accepts an empty priorities array (means all priorities)", () => {
      const query = {
        kind: "range",
        start: "2026-07-14T00:00:00Z",
        end: "2026-07-21T00:00:00Z",
        priorities: [],
      };

      expect(EventListQuerySchema.safeParse(query).success).toBe(true);
    });

    it("rejects a range end before start", () => {
      const query = {
        kind: "range",
        start: "2026-07-21T00:00:00Z",
        end: "2026-07-14T00:00:00Z",
        priorities: [],
      };

      expect(EventListQuerySchema.safeParse(query).success).toBe(false);
    });

    it("parses a someday query with only period and anchorDate", () => {
      const query = {
        kind: "someday",
        period: "month",
        anchorDate: "2026-07-01",
      };

      expect(EventListQuerySchema.safeParse(query).success).toBe(true);
    });

    it("rejects a someday query with a cursor/limit-like key", () => {
      const query = {
        kind: "someday",
        period: "month",
        anchorDate: "2026-07-01",
        limit: 9,
      };

      expect(EventListQuerySchema.safeParse(query).success).toBe(false);
    });
  });

  describe("EventListResponseSchema", () => {
    it("accepts an events-only payload", () => {
      expect(EventListResponseSchema.safeParse({ events: [] }).success).toBe(
        true,
      );
    });

    it("rejects unknown keys alongside events", () => {
      const result = EventListResponseSchema.safeParse({
        events: [],
        nextCursor: null,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("AvailabilityQuerySchema", () => {
    it("accepts unique calendar ids with end after start", () => {
      const query = {
        calendarIds: [calendarId(), calendarId()],
        start: "2026-07-14T00:00:00Z",
        end: "2026-07-14T01:00:00Z",
      };

      expect(AvailabilityQuerySchema.safeParse(query).success).toBe(true);
    });

    it("rejects duplicate calendar ids", () => {
      const id = calendarId();
      const query = {
        calendarIds: [id, id],
        start: "2026-07-14T00:00:00Z",
        end: "2026-07-14T01:00:00Z",
      };

      expect(AvailabilityQuerySchema.safeParse(query).success).toBe(false);
    });

    it("rejects end before or equal to start", () => {
      const query = {
        calendarIds: [calendarId()],
        start: "2026-07-14T01:00:00Z",
        end: "2026-07-14T00:00:00Z",
      };

      expect(AvailabilityQuerySchema.safeParse(query).success).toBe(false);
    });
  });

  describe("EventMutationErrorSchema", () => {
    it("accepts every mutation error code", () => {
      const codes = [
        "EVENT_NOT_FOUND",
        "CALENDAR_NOT_FOUND",
        "CALENDAR_READ_ONLY",
        "RECURRENCE_CONFLICT",
        "DUPLICATE_EVENT_ID",
        "INVALID_SCHEDULE",
        "PROVIDER_FAILURE",
      ] as const;

      for (const code of codes) {
        const error = { code, message: "failed", retryable: false };

        expect(EventMutationErrorSchema.safeParse(error).success).toBe(true);
      }
    });

    it("rejects an unrecognized code", () => {
      const error = { code: "WAT", message: "failed", retryable: false };

      expect(EventMutationErrorSchema.safeParse(error).success).toBe(false);
    });

    it("rejects an empty message", () => {
      const error = {
        code: "EVENT_NOT_FOUND",
        message: "",
        retryable: false,
      };

      expect(EventMutationErrorSchema.safeParse(error).success).toBe(false);
    });
  });
});
