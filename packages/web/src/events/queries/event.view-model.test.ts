import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { COLUMN_WEEK } from "@web/common/constants/web.constants";
import { type NormalizedEventQueryData } from "./event.query.types";
import {
  deriveCalendarEventViewModel,
  deriveSomedayEventViewModel,
} from "./event.view-model";

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

  test("preserves Someday ID order and derives week/month sections", () => {
    const first = createMockEvent({
      schedule: EventScheduleSchema.parse({
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-05",
        sortOrder: 0,
      }),
    });
    const second = createMockEvent({
      schedule: EventScheduleSchema.parse({
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-05",
        sortOrder: 1,
      }),
    });

    const result = deriveSomedayEventViewModel(
      normalized(first, second),
      undefined,
    );

    expect(result.orderedEvents.map(({ _id }) => _id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(result.categorized.columns[COLUMN_WEEK].eventIds).toEqual([
      first.id,
      second.id,
    ]);
    expect(result.weekCount).toBe(2);
    expect(result.isAtWeeklyLimit).toBe(false);
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
