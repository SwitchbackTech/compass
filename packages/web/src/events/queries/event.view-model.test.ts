import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type NormalizedEventQueryData } from "./event.query.types";
import { deriveCalendarEventViewModel } from "./event.view-model";

const normalized = (
  ...events: ReturnType<typeof createMockEvent>[]
): NormalizedEventQueryData => ({
  ids: events.map(({ id }) => id),
  entities: Object.fromEntries(events.map((item) => [item.id, item])),
});

describe("Event query view models", () => {
  test("derives Week and Day timed/all-day layouts", () => {
    const timed = createMockEvent();
    const allDay = createMockEvent({
      schedule: EventScheduleSchema.parse({
        kind: "allDay",
        start: "2026-07-05",
        end: "2026-07-06",
      }),
    });
    const data = normalized(timed, allDay);

    const week = deriveCalendarEventViewModel(data);
    const day = deriveCalendarEventViewModel(data);

    expect(week.timedEvents.map(({ _id }) => _id)).toEqual([timed.id]);
    expect(week.allDayEvents.map(({ _id }) => _id)).toEqual([allDay.id]);
    expect(week.rowCount).toBe(1);
    expect(day.events).toEqual([timed, allDay]);
    expect(day.timedEvents).toEqual(week.timedEvents);
  });

  test("excludes a series base from grid cards but keeps its occurrence", () => {
    const base = createMockEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const occurrence = createMockEvent({
      recurrence: { kind: "occurrence", seriesId: base.id },
    });
    const data = normalized(base, occurrence);

    const result = deriveCalendarEventViewModel(data);

    expect(result.timedEvents.map(({ _id }) => _id)).toEqual([occurrence.id]);
    expect(result.events.map(({ id }) => id)).toEqual([base.id, occurrence.id]);
  });

  test("returns stable empty shapes", () => {
    const week = deriveCalendarEventViewModel();
    expect(week).toEqual({
      entities: {},
      events: [],
      timedEvents: [],
      allDayEvents: [],
      rowCount: 1,
    });
  });
});
