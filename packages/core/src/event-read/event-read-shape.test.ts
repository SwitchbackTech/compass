import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { shapeEventRead } from "./event-read-shape";
import { describe, expect, it } from "bun:test";

const makeEvent = (overrides: Partial<Schema_Event> = {}): Schema_Event => ({
  _id: "event-1",
  title: "Event",
  startDate: "2026-04-06T15:00:00.000Z",
  endDate: "2026-04-06T16:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  ...overrides,
});

const calendarWindow = {
  mode: "calendar" as const,
  startDate: "2026-04-06T00:00:00.000Z",
  endDate: "2026-04-13T00:00:00.000Z",
};

describe("shapeEventRead", () => {
  it("returns timed calendar events fully inside the requested window", () => {
    const insideEvent = makeEvent({ _id: "inside" });
    const outsideEvent = makeEvent({
      _id: "outside",
      startDate: "2026-04-05T15:00:00.000Z",
      endDate: "2026-04-05T16:00:00.000Z",
    });

    const result = shapeEventRead({
      window: calendarWindow,
      events: [insideEvent, outsideEvent],
    });

    expect(result.data.map((event) => event._id)).toEqual(["inside"]);
    expect(result.count).toBe(1);
    expect(result.startDate).toBe(calendarWindow.startDate);
    expect(result.endDate).toBe(calendarWindow.endDate);
  });

  it("returns all-day calendar events that overlap the requested window", () => {
    const firstDayAllDayEvent = makeEvent({
      _id: "first-day",
      isAllDay: true,
      startDate: "2026-04-06",
      endDate: "2026-04-07",
    });
    const previousAllDayEvent = makeEvent({
      _id: "previous-day",
      isAllDay: true,
      startDate: "2026-04-05",
      endDate: "2026-04-06",
    });

    const result = shapeEventRead({
      window: calendarWindow,
      events: [firstDayAllDayEvent, previousAllDayEvent],
    });

    expect(result.data.map((event) => event._id)).toEqual(["first-day"]);
  });

  it("excludes base events and returns instances with base recurrence rules", () => {
    const baseEvent = makeEvent({
      _id: "base",
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    });
    const instanceEvent = makeEvent({
      _id: "instance",
      recurrence: { eventId: "base" },
    });

    const result = shapeEventRead({
      window: calendarWindow,
      events: [baseEvent, instanceEvent],
      baseEventsById: { base: baseEvent },
    });

    expect(result.data.map((event) => event._id)).toEqual(["instance"]);
    expect(result.data[0]?.recurrence).toEqual({
      eventId: "base",
      rule: ["RRULE:FREQ=WEEKLY"],
    });
  });

  it("repairs missing someday order values deterministically", () => {
    const somedayWindow = {
      mode: "someday" as const,
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-04-30T23:59:59.999Z",
    };
    const orderedSomeday = makeEvent({
      _id: "ordered",
      isSomeday: true,
      order: 2,
    });
    const missingOrderA = makeEvent({
      _id: "missing-a",
      isSomeday: true,
      order: undefined,
    });
    const missingOrderB = makeEvent({
      _id: "missing-b",
      isSomeday: true,
      order: undefined,
    });
    const calendarEvent = makeEvent({ _id: "calendar", isSomeday: false });

    const result = shapeEventRead({
      window: somedayWindow,
      events: [missingOrderA, orderedSomeday, calendarEvent, missingOrderB],
    });

    expect(result.data.map((event) => [event._id, event.order])).toEqual([
      ["missing-a", 3],
      ["ordered", 2],
      ["missing-b", 4],
    ]);
  });
});
