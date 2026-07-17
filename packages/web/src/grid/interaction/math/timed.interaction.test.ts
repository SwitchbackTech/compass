import { type GridLayoutCache } from "../layout.cache";
import { createTimedDragVisual, updateTimedDragVisual } from "./timed.drag";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "./timed.resize";
import { describe, expect, it } from "bun:test";

const layout: GridLayoutCache = {
  dayColumns: [
    { date: "2026-07-16", index: 0, left: 0, width: 100 },
    { date: "2026-07-17", index: 1, left: 100, width: 100 },
  ],
  edgeNavigation: {
    bottom: 600,
    edgeThresholdPx: 40,
    left: 0,
    right: 200,
    top: 0,
  },
  pixelsPerMinute: 1,
  snapMinutes: 15,
};

const sourceRect = { height: 60, left: 0, top: 60, width: 100 };

describe("timed interaction math", () => {
  it("snaps a drag across time and day columns", () => {
    const visual = createTimedDragVisual({
      dayDate: "2026-07-16",
      dayIndex: 0,
      endMinutes: 120,
      eventId: "event-1",
      pointerStart: { x: 50, y: 90 },
      sourceRect,
      startMinutes: 60,
    });

    const next = updateTimedDragVisual(visual, {
      layout,
      pointer: { x: 150, y: 120 },
    });

    expect(next).toMatchObject({
      dayDate: "2026-07-17",
      dayIndex: 1,
      endMinutes: 150,
      startMinutes: 90,
      transform: { x: 100, y: 30 },
    });
  });

  it("keeps a drag inside the visible grid", () => {
    const visual = createTimedDragVisual({
      dayDate: "2026-07-16",
      dayIndex: 0,
      endMinutes: 120,
      eventId: "event-1",
      pointerStart: { x: 50, y: 90 },
      sourceRect,
      startMinutes: 60,
    });

    const next = updateTimedDragVisual(visual, {
      layout,
      pointer: { x: 50, y: -100 },
    });

    expect(next).toMatchObject({
      endMinutes: 60,
      startMinutes: 0,
      transform: { x: 0, y: -60 },
    });
  });

  it("resizes on the time step and flips the active edge when crossed", () => {
    const visual = createTimedResizeVisual({
      edge: "endDate",
      endMinutes: 120,
      eventId: "event-1",
      pointerStart: { x: 50, y: 120 },
      sourceRect,
      startMinutes: 60,
    });

    const grown = updateTimedResizeVisual(visual, {
      layout,
      pointer: { x: 50, y: 152 },
    });
    const flipped = updateTimedResizeVisual(visual, {
      layout,
      pointer: { x: 50, y: 30 },
    });

    expect(grown).toMatchObject({ endMinutes: 150, height: 90 });
    expect(flipped).toMatchObject({
      edge: "startDate",
      endMinutes: 60,
      startMinutes: 30,
    });
  });
});
