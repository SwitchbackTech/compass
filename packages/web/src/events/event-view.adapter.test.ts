import { Priorities } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { presentGridEvent } from "./event-view.adapter";
import { expect, test } from "bun:test";

test("presents a timed event for the grid with its recurrence and priority", () => {
  const schedule = EventScheduleSchema.parse({
    kind: "timed",
    start: "2026-07-11T09:00:00.000-06:00",
    end: "2026-07-11T10:00:00.000-06:00",
    timeZone: "America/Denver",
  });
  if (schedule.kind !== "timed") throw new Error("expected timed schedule");
  const event = createMockEvent({
    priority: Priorities.WORK,
    recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    schedule,
  });

  expect(presentGridEvent(event)).toEqual({
    eventId: event.id,
    calendarId: event.calendarId,
    content: event.content,
    priority: Priorities.WORK,
    recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    kind: "timed",
    start: schedule.start,
    end: schedule.end,
    timeZone: schedule.timeZone,
  });
});

test("preserves the exclusive all-day end date", () => {
  const schedule = EventScheduleSchema.parse({
    kind: "allDay",
    start: "2026-07-11",
    end: "2026-07-14",
  });
  const event = createMockEvent({
    schedule,
    recurrence: {
      kind: "occurrence",
      seriesId: EventIdSchema.parse("0123456789abcdef01234567"),
    },
  });

  expect(presentGridEvent(event)).toMatchObject({
    kind: "allDay",
    start: "2026-07-11",
    end: "2026-07-14",
    recurrence: { kind: "occurrence" },
  });
});
