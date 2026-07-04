import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  deriveCalendarEventViewModel,
  deriveSomedayEventViewModel,
} from "./event.view-model";

const event = (overrides: Partial<Schema_Event>): Schema_Event => ({
  _id: "event",
  title: "Event",
  user: "user",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  startDate: "2026-07-05T10:00:00.000Z",
  endDate: "2026-07-05T11:00:00.000Z",
  isSomeday: false,
  ...overrides,
});

const normalized = (...events: Schema_Event[]) => ({
  ids: events.map(({ _id }) => _id as string),
  entities: Object.fromEntries(events.map((item) => [item._id, item])),
});

describe("Event query view models", () => {
  test("derives Week and Day timed/all-day layouts", () => {
    const timed = event({ _id: "timed" });
    const allDay = event({
      _id: "all-day",
      isAllDay: true,
      startDate: "2026-07-05",
      endDate: "2026-07-06",
    });
    const data = normalized(timed, allDay);

    const week = deriveCalendarEventViewModel(data);
    const day = deriveCalendarEventViewModel(data);

    expect(week.timedEvents.map(({ _id }) => _id)).toEqual(["timed"]);
    expect(week.allDayEvents.map(({ _id }) => _id)).toEqual(["all-day"]);
    expect(week.rowCount).toBe(1);
    expect(day.events).toEqual([timed, allDay]);
    expect(day.timedEvents).toEqual(week.timedEvents);
  });

  test("preserves Someday ID order and derives sections", () => {
    const second = event({
      _id: "000000000000000000000002",
      isSomeday: true,
      order: 1,
      startDate: "2026-07-06",
      endDate: "2026-07-07",
    });
    const first = event({
      _id: "000000000000000000000001",
      isSomeday: true,
      order: 0,
      startDate: "2026-07-05",
      endDate: "2026-07-06",
    });

    const result = deriveSomedayEventViewModel(normalized(first, second), {
      start: dayjs("2026-07-05"),
      end: dayjs("2026-07-11"),
    });

    expect(result.orderedEvents.map(({ _id }) => _id)).toEqual([
      "000000000000000000000001",
      "000000000000000000000002",
    ]);
    expect(result.categorized.columns[COLUMN_WEEK].eventIds).toEqual([
      "000000000000000000000001",
      "000000000000000000000002",
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
