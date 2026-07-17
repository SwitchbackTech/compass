import { type GridEvent } from "@web/common/types/web.event.types";
import { type AllDayDragVisual } from "@web/grid/interaction/types/all-day-drag.types";
import { type TimedDragVisual } from "@web/grid/interaction/types/timed-drag.types";
import {
  allDayDragVisualToTimedGridEvent,
  timedDragVisualToAllDayGridEvent,
} from "./cross-row.commit";
import { describe, expect, it } from "bun:test";

// All-day dates are date-only with an exclusive end, so this single-day event
// on the 13th ends on the 14th.
const allDayEvent = {
  _id: "all-day-event",
  endDate: "2026-05-14",
  isAllDay: true,
  startDate: "2026-05-13",
  title: "All-day event",
} as GridEvent;

const timedEvent = {
  _id: "timed-event",
  endDate: "2026-05-19T10:00:00.000",
  isAllDay: false,
  startDate: "2026-05-19T09:00:00.000",
  title: "Timed event",
} as GridEvent;

const allDayDragVisual = (
  overrides: Partial<AllDayDragVisual> = {},
): AllDayDragVisual => ({
  crossRowSize: null,
  dayDate: "2026-05-13",
  dayIndex: 3,
  eventId: "all-day-event",
  initialDayDate: "2026-05-13",
  initialDayIndex: 3,
  pointerStart: { x: 0, y: 0 },
  row: "timed",
  sourceRect: { height: 20, left: 0, top: 0, width: 90 },
  timedStartMinutes: null,
  transform: { x: 0, y: 0 },
  type: "allDayDrag",
  ...overrides,
});

const timedDragVisual = (
  overrides: Partial<TimedDragVisual> = {},
): TimedDragVisual => ({
  crossRowSize: null,
  dayDate: "2026-05-19",
  dayIndex: 2,
  durationMinutes: 60,
  endMinutes: 600,
  eventId: "timed-event",
  initialDayDate: "2026-05-19",
  initialDayIndex: 2,
  initialEndMinutes: 600,
  initialStartMinutes: 540,
  pointerStart: { x: 0, y: 0 },
  row: "allDay",
  sourceRect: { height: 60, left: 0, top: 0, width: 90 },
  startMinutes: 540,
  transform: { x: 0, y: 0 },
  type: "timedDrag",
  ...overrides,
});

describe("allDayDragVisualToTimedGridEvent", () => {
  it("invents a default-length block at the dropped start time on the drop column", () => {
    const result = allDayDragVisualToTimedGridEvent(
      allDayEvent,
      allDayDragVisual({ dayDate: "2026-05-15", timedStartMinutes: 600 }),
    );

    expect(result.isAllDay).toBe(false);
    expect(result.startDate).toContain("2026-05-15");
    expect(result.startDate).toContain("10:00");
    expect(result.endDate).toContain("2026-05-15");
    expect(result.endDate).toContain("11:00");
  });

  it("assigns the day absolutely, so a window-clamped multi-day span lands where it was dropped", () => {
    const multiDay = { ...allDayEvent, endDate: "2026-05-18" };
    const result = allDayDragVisualToTimedGridEvent(
      multiDay,
      allDayDragVisual({
        dayDate: "2026-05-16",
        initialDayDate: "2026-05-13",
        timedStartMinutes: 0,
      }),
    );

    // The 5-day span collapses onto the drop column rather than shifting by the
    // 3-day delta an all-day drop would have applied.
    expect(result.startDate).toContain("2026-05-16");
    expect(result.startDate).toContain("00:00");
    expect(result.endDate).toContain("01:00");
  });

  it("preserves the event's identity and title", () => {
    const result = allDayDragVisualToTimedGridEvent(
      allDayEvent,
      allDayDragVisual({ timedStartMinutes: 60 }),
    );

    expect(result._id).toBe("all-day-event");
    expect(result.title).toBe("All-day event");
  });
});

describe("timedDragVisualToAllDayGridEvent", () => {
  it("discards the time of day and ends on the following date", () => {
    const result = timedDragVisualToAllDayGridEvent(
      timedEvent,
      timedDragVisual({ dayDate: "2026-05-21" }),
    );

    expect(result.isAllDay).toBe(true);
    expect(result.startDate).toBe("2026-05-21");
    expect(result.endDate).toBe("2026-05-22");
  });

  it("keeps a same-day drop as a one-day all-day event", () => {
    const result = timedDragVisualToAllDayGridEvent(
      timedEvent,
      timedDragVisual({ dayDate: "2026-05-19" }),
    );

    expect(result.startDate).toBe("2026-05-19");
    expect(result.endDate).toBe("2026-05-20");
  });

  it("ignores the minutes the visual carried over from the timed grid", () => {
    const result = timedDragVisualToAllDayGridEvent(
      timedEvent,
      timedDragVisual({
        dayDate: "2026-05-21",
        endMinutes: 1350,
        startMinutes: 1290,
      }),
    );

    expect(result.startDate).toBe("2026-05-21");
    expect(result.endDate).toBe("2026-05-22");
  });
});
