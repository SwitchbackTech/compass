import { type CalendarLayoutCache } from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import {
  CROSS_ROW_TIMED_DURATION_MIN,
  getCalendarDragRowLayouts,
  getCrossRowAllDayPlacement,
  getCrossRowTimedPlacement,
  resolveCalendarDragRow,
} from "./crossRowDrag";
import { describe, expect, it } from "bun:test";

const dayColumns = (left: number, width: number) =>
  ["2026-05-11", "2026-05-12", "2026-05-13"].map((date, index) => ({
    date,
    index,
    left: left + width * index,
    width,
  }));

// All-day row: y 20..60. Timed grid: y 100..1400, 13 visible hours.
const allDayLayout: CalendarLayoutCache = {
  dayColumns: dayColumns(100, 100),
  edgeNavigation: {
    bottom: 60,
    edgeThresholdPx: 10,
    left: 100,
    right: 400,
    top: 20,
  },
  pixelsPerMinute: 1,
  snapMinutes: 15,
};

const timedLayout: CalendarLayoutCache = {
  dayColumns: dayColumns(100, 100),
  edgeNavigation: {
    bottom: 1400,
    edgeThresholdPx: 10,
    left: 100,
    right: 400,
    top: 100,
  },
  // 1px per minute keeps the arithmetic below readable.
  pixelsPerMinute: 1,
  snapMinutes: 15,
};

const sourceRect = { height: 20, left: 100, top: 25, width: 100 };

describe("resolveCalendarDragRow", () => {
  it("resolves to the all-day row inside its rect and the timed grid below it", () => {
    const rows = {
      allDay: allDayLayout,
      sourceRow: "allDay",
      timed: timedLayout,
    } as const;

    expect(resolveCalendarDragRow({ ...rows, pointerY: 40 })).toBe("allDay");
    expect(resolveCalendarDragRow({ ...rows, pointerY: 20 })).toBe("allDay");
    expect(resolveCalendarDragRow({ ...rows, pointerY: 60 })).toBe("allDay");
    expect(resolveCalendarDragRow({ ...rows, pointerY: 61 })).toBe("timed");
    expect(resolveCalendarDragRow({ ...rows, pointerY: 800 })).toBe("timed");
  });

  it("stays on the drag's own row when the other row is not on screen", () => {
    expect(
      resolveCalendarDragRow({
        allDay: null,
        pointerY: 800,
        sourceRow: "allDay",
        timed: timedLayout,
      }),
    ).toBe("allDay");
    expect(
      resolveCalendarDragRow({
        allDay: allDayLayout,
        pointerY: 40,
        sourceRow: "timed",
        timed: null,
      }),
    ).toBe("timed");
  });

  it("is pure in the pointer, so the engine's pointerup rerun reproduces the row", () => {
    const input = {
      allDay: allDayLayout,
      pointerY: 800,
      sourceRow: "allDay",
      timed: timedLayout,
    } as const;

    expect(resolveCalendarDragRow(input)).toBe(resolveCalendarDragRow(input));
  });
});

describe("getCalendarDragRowLayouts", () => {
  it("reads the primary cache as the drag's own row and crossRow as the other", () => {
    const paired = { ...allDayLayout, crossRow: timedLayout };

    expect(getCalendarDragRowLayouts(paired, "allDay")).toEqual({
      allDay: paired,
      timed: timedLayout,
    });
    expect(
      getCalendarDragRowLayouts(
        { ...timedLayout, crossRow: allDayLayout },
        "timed",
      ),
    ).toEqual({
      allDay: allDayLayout,
      timed: { ...timedLayout, crossRow: allDayLayout },
    });
  });

  it("reports the other row as absent when it was never cached", () => {
    expect(getCalendarDragRowLayouts(allDayLayout, "allDay").timed).toBeNull();
  });
});

describe("getCrossRowTimedPlacement", () => {
  it("snaps the start to the pointer and sizes the ghost to the default duration", () => {
    const placement = getCrossRowTimedPlacement({
      layout: timedLayout,
      pointer: { x: 150, y: 320 },
      sourceRect,
    });

    // 220px below the grid top at 1px/min, snapped up to the 15-min step.
    expect(placement.startMinutes).toBe(225);
    expect(placement.column?.date).toBe("2026-05-11");
    expect(placement.height).toBe(CROSS_ROW_TIMED_DURATION_MIN);
    expect(placement.width).toBe(100);
  });

  it("places the ghost's top at the snapped start so the drop matches what was drawn", () => {
    const placement = getCrossRowTimedPlacement({
      layout: timedLayout,
      pointer: { x: 150, y: 400 },
      sourceRect,
    });

    // startMinutes 300 -> grid top 100 + 300 = y 400, minus the source's own top.
    expect(placement.startMinutes).toBe(300);
    expect(placement.transform.y).toBe(100 + 300 - sourceRect.top);
  });

  it("moves the ghost onto the column under the pointer", () => {
    const placement = getCrossRowTimedPlacement({
      layout: timedLayout,
      pointer: { x: 320, y: 400 },
      sourceRect,
    });

    expect(placement.column?.date).toBe("2026-05-13");
    expect(placement.transform.x).toBe(300 - sourceRect.left);
  });

  it("offsets the start by the timed grid's live scroll position, not the cached one", () => {
    const element = document.createElement("div");
    // Scrolled since the cache was built: the live value is what counts.
    Object.defineProperty(element, "scrollTop", { value: 600, writable: true });

    const placement = getCrossRowTimedPlacement({
      layout: {
        ...timedLayout,
        smartScroll: {
          bottom: 1400,
          edgeThresholdPx: 10,
          element,
          initialScrollTop: 0,
          maxScrollTop: 1000,
          speedPx: 10,
          top: 100,
        },
      },
      pointer: { x: 150, y: 400 },
      sourceRect,
    });

    expect(placement.startMinutes).toBe(900);
  });

  it("clamps the start so the invented block cannot spill past midnight", () => {
    const placement = getCrossRowTimedPlacement({
      layout: timedLayout,
      pointer: { x: 150, y: 100_000 },
      sourceRect,
    });

    expect(placement.startMinutes).toBe(24 * 60 - CROSS_ROW_TIMED_DURATION_MIN);
  });
});

describe("getCrossRowAllDayPlacement", () => {
  it("sizes the ghost to an all-day chip on the column under the pointer", () => {
    const placement = getCrossRowAllDayPlacement({
      layout: allDayLayout,
      pointer: { x: 220, y: 40 },
      sourceRect: { height: 60, left: 100, top: 900, width: 90 },
    });

    expect(placement.column?.date).toBe("2026-05-12");
    expect(placement.height).toBe(20);
    expect(placement.width).toBe(100);
    expect(placement.transform).toEqual({ x: 100, y: 20 - 900 });
  });
});
