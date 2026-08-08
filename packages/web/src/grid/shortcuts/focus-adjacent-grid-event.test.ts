import { Origin } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import {
  getChronologicallyAdjacentTarget,
  getFirstEventOnWeekdayColumn,
  getSpatiallyAdjacentTarget,
} from "@web/grid/shortcuts/focus-adjacent-grid-event";
import { describe, expect, it } from "bun:test";

const event = (id: string, startDate: string, isAllDay = false): GridEvent => ({
  _id: id,
  endDate: isAllDay ? "2026-05-21" : "2026-05-20T10:00:00.000",
  isAllDay,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  startDate,
  title: id,
  user: "user-1",
});

const target = (
  eventId: string,
  eventType: "all-day" | "timed",
  element = document.createElement("button"),
) => ({ element, eventId, eventType });

const weekDays = Array.from({ length: 7 }, (_, index) =>
  dayjs("2026-05-18").add(index, "day"),
);

describe("getChronologicallyAdjacentTarget", () => {
  it("returns the next later event", () => {
    const earlier = target("a", "timed");
    const later = target("b", "timed");
    const next = getChronologicallyAdjacentTarget({
      allDayEvents: [],
      direction: "next",
      focused: earlier,
      timedEvents: [
        event("a", "2026-05-20T09:00:00.000"),
        event("b", "2026-05-20T11:00:00.000"),
      ],
      visible: [later, earlier],
    });

    expect(next?.eventId).toBe("b");
  });

  it("returns the previous earlier event", () => {
    const earlier = target("a", "timed");
    const later = target("b", "timed");
    const previous = getChronologicallyAdjacentTarget({
      allDayEvents: [],
      direction: "previous",
      focused: later,
      timedEvents: [
        event("a", "2026-05-20T09:00:00.000"),
        event("b", "2026-05-20T11:00:00.000"),
      ],
      visible: [earlier, later],
    });

    expect(previous?.eventId).toBe("a");
  });

  it("prefers all-day before timed on the same start day", () => {
    const allDay = target("all", "all-day");
    const timed = target("timed", "timed");
    const next = getChronologicallyAdjacentTarget({
      allDayEvents: [event("all", "2026-05-20", true)],
      direction: "next",
      focused: allDay,
      timedEvents: [event("timed", "2026-05-20T09:00:00.000")],
      visible: [timed, allDay],
    });

    expect(next?.eventId).toBe("timed");
  });

  it("stops at the ends without wrapping", () => {
    const only = target("a", "timed");
    expect(
      getChronologicallyAdjacentTarget({
        allDayEvents: [],
        direction: "previous",
        focused: only,
        timedEvents: [event("a", "2026-05-20T09:00:00.000")],
        visible: [only],
      }),
    ).toBeNull();
  });
});

describe("getSpatiallyAdjacentTarget", () => {
  const mondayMorning = target("mon-am", "timed");
  const mondayAfternoon = target("mon-pm", "timed");
  const mondayEvening = target("mon-eve", "timed");
  const wednesdayNoon = target("wed-noon", "timed");
  const wednesdayLater = target("wed-later", "timed");
  const fridayMorning = target("fri-am", "timed");

  const timedEvents = [
    event("mon-am", "2026-05-18T09:00:00.000"),
    event("mon-pm", "2026-05-18T14:00:00.000"),
    event("mon-eve", "2026-05-18T17:00:00.000"),
    event("wed-noon", "2026-05-20T12:00:00.000"),
    event("wed-later", "2026-05-20T15:00:00.000"),
    event("fri-am", "2026-05-22T09:00:00.000"),
  ];

  const visible = [
    mondayMorning,
    mondayAfternoon,
    mondayEvening,
    wednesdayNoon,
    wednesdayLater,
    fridayMorning,
  ];

  it("keeps ArrowDown on the same day", () => {
    const next = getSpatiallyAdjacentTarget({
      allDayEvents: [],
      direction: "down",
      focused: mondayMorning,
      timedEvents,
      visible,
      weekDays,
    });

    expect(next?.eventId).toBe("mon-pm");
  });

  it("does not leave the day at the bottom", () => {
    expect(
      getSpatiallyAdjacentTarget({
        allDayEvents: [],
        direction: "down",
        focused: mondayEvening,
        timedEvents,
        visible,
        weekDays,
      }),
    ).toBeNull();
  });

  it("skips empty days and picks the time-nearest event", () => {
    // Monday 5pm -> skip Tuesday -> Wednesday, nearest to 17:00 is 15:00.
    const next = getSpatiallyAdjacentTarget({
      allDayEvents: [],
      direction: "right",
      focused: mondayEvening,
      timedEvents,
      visible,
      weekDays,
    });

    expect(next?.eventId).toBe("wed-later");
  });

  it("moves left to the nearest event on the previous non-empty day", () => {
    const previous = getSpatiallyAdjacentTarget({
      allDayEvents: [],
      direction: "left",
      focused: fridayMorning,
      timedEvents,
      visible,
      weekDays,
    });

    expect(previous?.eventId).toBe("wed-noon");
  });

  it("treats all-day as the first event on its day for Up/Down", () => {
    const allDay = target("wed-all", "all-day");
    const next = getSpatiallyAdjacentTarget({
      allDayEvents: [event("wed-all", "2026-05-20", true)],
      direction: "down",
      focused: allDay,
      timedEvents: [event("wed-noon", "2026-05-20T12:00:00.000")],
      visible: [wednesdayNoon, allDay],
      weekDays,
    });

    expect(next?.eventId).toBe("wed-noon");
  });
});

describe("getFirstEventOnWeekdayColumn", () => {
  it("returns the first chronological event on the leftmost column for digit 1", () => {
    const mondayAllDay = target("mon-all", "all-day");
    const mondayTimed = target("mon-am", "timed");
    const wednesday = target("wed-noon", "timed");

    const first = getFirstEventOnWeekdayColumn({
      allDayEvents: [event("mon-all", "2026-05-18", true)],
      columnIndex: 0,
      timedEvents: [
        event("mon-am", "2026-05-18T09:00:00.000"),
        event("wed-noon", "2026-05-20T12:00:00.000"),
      ],
      visible: [mondayTimed, wednesday, mondayAllDay],
      weekDays,
    });

    expect(first?.eventId).toBe("mon-all");
  });

  it("returns null when the column has no visible events", () => {
    const wednesday = target("wed-noon", "timed");
    expect(
      getFirstEventOnWeekdayColumn({
        allDayEvents: [],
        columnIndex: 0,
        timedEvents: [event("wed-noon", "2026-05-20T12:00:00.000")],
        visible: [wednesday],
        weekDays,
      }),
    ).toBeNull();
  });
});
