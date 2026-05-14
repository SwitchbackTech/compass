import { createAllDayDragVisual, updateAllDayDragVisual } from "./allDayDrag";
import { describe, expect, it } from "bun:test";

const layout = {
  dayColumns: Array.from({ length: 7 }, (_, index) => ({
    index,
    left: index * 100,
    width: 100,
  })),
  pixelsPerMinute: 1,
  snapMinutes: 30,
};

describe("all-day drag visual math", () => {
  it("moves horizontally by cached day columns", () => {
    const visual = createAllDayDragVisual({
      dayIndex: 2,
      eventId: "event-1",
      pointerStart: { x: 250, y: 40 },
      sourceRect: { height: 28, left: 200, top: 20, width: 100 },
    });

    expect(
      updateAllDayDragVisual(visual, {
        layout,
        pointer: { x: 370, y: 40 },
      }),
    ).toMatchObject({
      dayIndex: 3,
      transform: { x: 100, y: 0 },
    });
  });
});
