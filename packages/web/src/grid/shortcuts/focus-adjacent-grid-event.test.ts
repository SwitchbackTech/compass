import { Origin } from "@core/constants/core.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { getChronologicallyAdjacentTarget } from "@web/grid/shortcuts/focus-adjacent-grid-event";
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
