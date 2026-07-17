import { type GridLayoutCache } from "../layout.cache";
import { createAllDayDragVisual, updateAllDayDragVisual } from "./all-day.drag";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "./all-day.resize";
import { describe, expect, it } from "bun:test";

const layout: GridLayoutCache = {
  dayColumns: [
    { date: "2026-07-16", index: 0, left: 0, width: 100 },
    { date: "2026-07-17", index: 1, left: 100, width: 100 },
    { date: "2026-07-18", index: 2, left: 200, width: 100 },
  ],
  edgeNavigation: {
    bottom: 40,
    edgeThresholdPx: 20,
    left: 0,
    right: 300,
    top: 0,
  },
  pixelsPerMinute: 1,
  snapMinutes: 15,
};

describe("all-day interaction math", () => {
  it("moves a drag by whole day columns", () => {
    const visual = createAllDayDragVisual({
      dayDate: "2026-07-17",
      dayIndex: 1,
      eventId: "event-1",
      pointerStart: { x: 150, y: 20 },
      sourceRect: { height: 20, left: 100, top: 0, width: 95 },
    });

    const next = updateAllDayDragVisual(visual, {
      layout,
      pointer: { x: 250, y: 20 },
    });

    expect(next).toMatchObject({
      dayDate: "2026-07-18",
      dayIndex: 2,
      transform: { x: 100, y: 0 },
    });
  });

  it("preserves card padding when a resize crosses its opposite edge", () => {
    const visual = createAllDayResizeVisual({
      edge: "startDate",
      endDayIndex: 1,
      eventId: "event-1",
      pointerStart: { x: 50, y: 20 },
      sourceRect: { height: 20, left: 0, top: 0, width: 195 },
      startDayIndex: 0,
    });

    const next = updateAllDayResizeVisual(visual, {
      layout,
      pointer: { x: 250, y: 20 },
    });

    expect(next).toMatchObject({
      endDayIndex: 2,
      startDayIndex: 1,
      transform: { x: 100, y: 0 },
      width: 195,
    });
  });
});
