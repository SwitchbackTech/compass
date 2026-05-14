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
      weekOffsetDays: 0,
    } satisfies AllDayDragVisual;

    expect(allDayDragVisualToGridEvent(event, visual)).toMatchObject({
      endDate: "2026-05-15",
      startDate: "2026-05-13",
      title: "Trip",
    });
    expect(hasAllDayDragVisualMoved(visual)).toBe(true);
  });

  it("applies edge-navigation week offsets", () => {
    const event = {
      _id: "event-1",
      endDate: "2026-05-17",
      isAllDay: true,
      startDate: "2026-05-16",
      title: "Trip",
    } as Schema_GridEvent;
    const visual = {
      dayIndex: 6,
      eventId: "event-1",
      initialDayIndex: 6,
      pointerStart: { x: 650, y: 20 },
      sourceRect: { height: 28, left: 600, top: 10, width: 96 },
      transform: { x: 0, y: 0 },
      type: "allDayDrag",
      weekOffsetDays: 7,
    } satisfies AllDayDragVisual;

    expect(allDayDragVisualToGridEvent(event, visual)).toMatchObject({
      endDate: "2026-05-24",
      startDate: "2026-05-23",
    });
    expect(hasAllDayDragVisualMoved(visual)).toBe(true);
  });
});
