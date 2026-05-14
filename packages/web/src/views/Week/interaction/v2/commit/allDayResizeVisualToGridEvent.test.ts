import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  allDayResizeVisualToGridEvent,
  hasAllDayResizeVisualChanged,
} from "./allDayResizeVisualToGridEvent";
import { describe, expect, it } from "bun:test";

const event = {
  _id: "event-1",
  endDate: "2026-05-15",
  isAllDay: true,
  startDate: "2026-05-13",
  title: "Original title",
} as Schema_GridEvent;

describe("allDayResizeVisualToGridEvent", () => {
  it("preserves exclusive all-day end-date semantics while resizing", () => {
    const visual = {
      activeEdge: "endDate",
      endDayIndex: 5,
      eventId: "event-1",
      initialEndDayIndex: 4,
      initialStartDayIndex: 3,
      pointerStart: { x: 0, y: 0 },
      sourceRect: { height: 20, left: 300, top: 0, width: 196 },
      startDayIndex: 3,
      transform: { x: 0, y: 0 },
      type: "allDayResize",
      width: 296,
    } as const;

    expect(allDayResizeVisualToGridEvent(event, visual)).toMatchObject({
      endDate: "2026-05-16",
      startDate: "2026-05-13",
      title: "Original title",
    });
  });

  it("normalizes legacy same-day end dates only after visible resize motion", () => {
    const legacyOneDayEvent = {
      ...event,
      endDate: "2026-05-13",
    };
    const unchangedVisual = {
      activeEdge: "endDate",
      endDayIndex: 3,
      eventId: "event-1",
      initialEndDayIndex: 3,
      initialStartDayIndex: 3,
      pointerStart: { x: 0, y: 0 },
      sourceRect: { height: 20, left: 300, top: 0, width: 96 },
      startDayIndex: 3,
      transform: { x: 0, y: 0 },
      type: "allDayResize",
      width: 96,
    } as const;
    const movedVisual = {
      ...unchangedVisual,
      endDayIndex: 4,
      width: 196,
    };

    expect(hasAllDayResizeVisualChanged(unchangedVisual)).toBe(false);
    expect(
      allDayResizeVisualToGridEvent(legacyOneDayEvent, unchangedVisual),
    ).toBe(legacyOneDayEvent);
    expect(
      allDayResizeVisualToGridEvent(legacyOneDayEvent, movedVisual),
    ).toMatchObject({
      endDate: "2026-05-15",
      startDate: "2026-05-13",
    });
  });
});
