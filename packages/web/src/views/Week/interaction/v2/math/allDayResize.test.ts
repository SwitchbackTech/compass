import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "./allDayResize";
import { describe, expect, it } from "bun:test";

const layout = {
  dayColumns: Array.from({ length: 7 }, (_, index) => ({
    index,
    left: index * 100,
    width: 100,
  })),
  pixelsPerMinute: 1,
  snapMinutes: 15,
};

const createVisual = (edge: "startDate" | "endDate") =>
  createAllDayResizeVisual({
    edge,
    endDayIndex: 3,
    eventId: "event-1",
    pointerStart: { x: 0, y: 0 },
    sourceRect: { height: 20, left: 200, top: 0, width: 196 },
    startDayIndex: 2,
  });

describe("all-day resize visual math", () => {
  it("resizes the right edge across day columns", () => {
    const visual = updateAllDayResizeVisual(createVisual("endDate"), {
      layout,
      pointer: { x: 455, y: 0 },
    });

    expect(visual).toMatchObject({
      activeEdge: "endDate",
      endDayIndex: 4,
      startDayIndex: 2,
      transform: { x: 0, y: 0 },
      width: 296,
    });
  });

  it("resizes the left edge across day columns", () => {
    const visual = updateAllDayResizeVisual(createVisual("startDate"), {
      layout,
      pointer: { x: 155, y: 0 },
    });

    expect(visual).toMatchObject({
      activeEdge: "startDate",
      endDayIndex: 3,
      startDayIndex: 1,
      transform: { x: -100, y: 0 },
      width: 296,
    });
  });

  it("flips left-to-right and right-to-left with a one-day minimum", () => {
    const leftToRight = updateAllDayResizeVisual(createVisual("startDate"), {
      layout,
      pointer: { x: 555, y: 0 },
    });
    const rightToLeft = updateAllDayResizeVisual(createVisual("endDate"), {
      layout,
      pointer: { x: 55, y: 0 },
    });
    const oneDay = updateAllDayResizeVisual(createVisual("endDate"), {
      layout,
      pointer: { x: 255, y: 0 },
    });

    expect(leftToRight).toMatchObject({
      activeEdge: "endDate",
      endDayIndex: 5,
      startDayIndex: 3,
      transform: { x: 100, y: 0 },
      width: 296,
    });
    expect(rightToLeft).toMatchObject({
      activeEdge: "startDate",
      endDayIndex: 2,
      startDayIndex: 0,
      transform: { x: -200, y: 0 },
      width: 296,
    });
    expect(oneDay).toMatchObject({
      activeEdge: "endDate",
      endDayIndex: 2,
      startDayIndex: 2,
      width: 96,
    });
  });

  it("clamps outside-week pointer positions to the nearest visible day", () => {
    const leftBoundary = updateAllDayResizeVisual(createVisual("startDate"), {
      layout,
      pointer: { x: -200, y: 0 },
    });
    const rightBoundary = updateAllDayResizeVisual(createVisual("endDate"), {
      layout,
      pointer: { x: 900, y: 0 },
    });

    expect(leftBoundary).toMatchObject({
      endDayIndex: 3,
      startDayIndex: 0,
      transform: { x: -200, y: 0 },
    });
    expect(rightBoundary).toMatchObject({
      endDayIndex: 6,
      startDayIndex: 2,
      transform: { x: 0, y: 0 },
    });
  });
});
