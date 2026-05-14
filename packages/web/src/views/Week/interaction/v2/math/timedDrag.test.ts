import { createTimedDragVisual, updateTimedDragVisual } from "./timedDrag";
import { describe, expect, it } from "bun:test";

describe("timed drag visual math", () => {
  it("preserves duration, snaps minutes, and moves by cached day columns", () => {
    const visual = createTimedDragVisual({
      dayIndex: 2,
      endMinutes: 660,
      eventId: "event-1",
      pointerStart: { x: 250, y: 120 },
      sourceRect: { height: 60, left: 220, top: 100, width: 120 },
      startMinutes: 600,
    });

    const next = updateTimedDragVisual(visual, {
      layout: {
        dayColumns: [
          { index: 0, left: 0, width: 100 },
          { index: 1, left: 100, width: 100 },
          { index: 2, left: 200, width: 100 },
          { index: 3, left: 300, width: 100 },
        ],
        pixelsPerMinute: 1,
        snapMinutes: 15,
      },
      pointer: { x: 345, y: 153 },
    });

    expect(next).toMatchObject({
      dayIndex: 3,
      endMinutes: 690,
      startMinutes: 630,
      transform: { x: 100, y: 30 },
    });
  });

  it("uses scroll delta for snapped time without drifting the overlay", () => {
    const visual = createTimedDragVisual({
      dayIndex: 2,
      endMinutes: 660,
      eventId: "event-1",
      pointerStart: { x: 250, y: 120 },
      sourceRect: { height: 60, left: 220, top: 100, width: 120 },
      startMinutes: 600,
    });

    const next = updateTimedDragVisual(visual, {
      layout: {
        dayColumns: [
          { index: 2, left: 200, width: 100 },
          { index: 3, left: 300, width: 100 },
        ],
        pixelsPerMinute: 1,
        snapMinutes: 15,
      },
      pointer: { x: 250, y: 153 },
      scrollDeltaPx: 60,
    });

    expect(next).toMatchObject({
      endMinutes: 750,
      startMinutes: 690,
      transform: { x: 0, y: 30 },
    });
  });
});
