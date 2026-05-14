import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import {
  allDayDragVisualToGridEvent,
  hasAllDayDragVisualMoved,
} from "./allDayDragVisualToGridEvent";
import { describe, expect, it } from "bun:test";

describe("allDayDragVisualToGridEvent", () => {
  it("moves date-only all-day events while preserving their span", () => {
    const event = {
      _id: "event-1",
      endDate: "2026-05-13",
      isAllDay: true,
      startDate: "2026-05-11",
      title: "Trip",
    } as Schema_GridEvent;
    const visual = {
      dayIndex: 3,
      eventId: "event-1",
      initialDayIndex: 1,
      pointerStart: { x: 150, y: 20 },
      sourceRect: { height: 28, left: 100, top: 10, width: 200 },
      transform: { x: 200, y: 0 },
      type: "allDayDrag",
    } satisfies AllDayDragVisual;

    expect(allDayDragVisualToGridEvent(event, visual)).toMatchObject({
      endDate: "2026-05-15",
      startDate: "2026-05-13",
      title: "Trip",
    });
    expect(hasAllDayDragVisualMoved(visual)).toBe(true);
  });
});
