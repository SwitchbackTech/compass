import { type GridEvent } from "@web/common/types/web.event.types";
import { assignDayAllDayEventRows } from "./dayAllDayRows.util";
import { describe, expect, it } from "bun:test";

const allDay = (
  id: string,
  calendarId: string,
  overrides: Partial<GridEvent> = {},
): GridEvent =>
  ({
    _id: id,
    calendarId,
    endDate: "2026-05-21",
    isAllDay: true,
    startDate: "2026-05-20",
    title: id,
    ...overrides,
  }) as GridEvent;

describe("assignDayAllDayEventRows", () => {
  it("returns one row when there are no all-day events", () => {
    expect(assignDayAllDayEventRows([], () => 0)).toEqual({
      allDayEvents: [],
      rowsCount: 1,
    });
  });

  it("lets all-day events on different calendars share row 1", () => {
    const events = [
      allDay("a", "cal-a"),
      allDay("b", "cal-b"),
      allDay("c", "cal-c"),
    ];
    const columnById = new Map([
      ["cal-a", 0],
      ["cal-b", 1],
      ["cal-c", 2],
    ]);

    const { allDayEvents, rowsCount } = assignDayAllDayEventRows(
      events,
      (event) => columnById.get(event.calendarId!) ?? 0,
    );

    expect(rowsCount).toBe(1);
    expect(allDayEvents.map((event) => event.row)).toEqual([1, 1, 1]);
  });

  it("stacks multiple all-day events in the same calendar column", () => {
    const events = [
      allDay("a1", "cal-a"),
      allDay("a2", "cal-a"),
      allDay("b1", "cal-b"),
    ];
    const columnById = new Map([
      ["cal-a", 0],
      ["cal-b", 1],
    ]);

    const { allDayEvents, rowsCount } = assignDayAllDayEventRows(
      events,
      (event) => columnById.get(event.calendarId!) ?? 0,
    );

    expect(rowsCount).toBe(2);
    expect(allDayEvents.find((event) => event._id === "a1")?.row).toBe(1);
    expect(allDayEvents.find((event) => event._id === "a2")?.row).toBe(2);
    expect(allDayEvents.find((event) => event._id === "b1")?.row).toBe(1);
  });
});
