import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "./timedResize";
import { describe, expect, it } from "bun:test";

const layout = {
  dayColumns: [{ index: 2, left: 200, width: 100 }],
  pixelsPerMinute: 1,
  snapMinutes: 30,
};

const sourceRect = { height: 60, left: 200, top: 100, width: 100 };

describe("timed resize visual math", () => {
  it("resizes the bottom edge later and earlier", () => {
    const visual = createTimedResizeVisual({
      dayIndex: 2,
      edge: "endDate",
      endMinutes: 11 * 60,
      eventId: "event-1",
      pointerStart: { x: 250, y: 160 },
      sourceRect,
      startMinutes: 10 * 60,
    });

    expect(
      updateTimedResizeVisual(visual, {
        layout,
        pointer: { x: 250, y: 220 },
      }),
    ).toMatchObject({
      activeEdge: "endDate",
      endMinutes: 12 * 60,
      startMinutes: 10 * 60,
      transform: { x: 0, y: 0 },
    });

    expect(
      updateTimedResizeVisual(visual, {
        layout,
        pointer: { x: 250, y: 130 },
      }),
    ).toMatchObject({
      activeEdge: "endDate",
      endMinutes: 10 * 60 + 30,
      startMinutes: 10 * 60,
    });
  });

  it("resizes the top edge earlier and later", () => {
    const visual = createTimedResizeVisual({
      dayIndex: 2,
      edge: "startDate",
      endMinutes: 11 * 60,
      eventId: "event-1",
      pointerStart: { x: 250, y: 100 },
      sourceRect,
      startMinutes: 10 * 60,
    });

    expect(
      updateTimedResizeVisual(visual, {
        layout,
        pointer: { x: 250, y: 40 },
      }),
    ).toMatchObject({
      activeEdge: "startDate",
      endMinutes: 11 * 60,
      startMinutes: 9 * 60,
      transform: { x: 0, y: -60 },
    });

    expect(
      updateTimedResizeVisual(visual, {
        layout,
        pointer: { x: 250, y: 130 },
      }),
    ).toMatchObject({
      activeEdge: "startDate",
      endMinutes: 11 * 60,
      startMinutes: 10 * 60 + 30,
      transform: { x: 0, y: 30 },
    });
  });

  it("flips edges and keeps a one-step minimum duration", () => {
    const topVisual = createTimedResizeVisual({
      dayIndex: 2,
      edge: "startDate",
      endMinutes: 11 * 60,
      eventId: "event-1",
      pointerStart: { x: 250, y: 100 },
      sourceRect,
      startMinutes: 10 * 60,
    });
    const bottomVisual = createTimedResizeVisual({
      dayIndex: 2,
      edge: "endDate",
      endMinutes: 11 * 60,
      eventId: "event-1",
      pointerStart: { x: 250, y: 160 },
      sourceRect,
      startMinutes: 10 * 60,
    });

    expect(
      updateTimedResizeVisual(topVisual, {
        layout,
        pointer: { x: 250, y: 190 },
      }),
    ).toMatchObject({
      activeEdge: "endDate",
      endMinutes: 11 * 60 + 30,
      startMinutes: 11 * 60,
    });
    expect(
      updateTimedResizeVisual(bottomVisual, {
        layout,
        pointer: { x: 250, y: 40 },
      }),
    ).toMatchObject({
      activeEdge: "startDate",
      endMinutes: 10 * 60,
      startMinutes: 9 * 60,
    });
  });
});
