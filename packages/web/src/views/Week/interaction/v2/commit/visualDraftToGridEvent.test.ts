import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type TimedDragVisual } from "../model/TimedDragVisual";
import {
  hasTimedDragVisualMoved,
  visualDraftToGridEvent,
} from "./visualDraftToGridEvent";
import { describe, expect, it } from "bun:test";

describe("visualDraftToGridEvent", () => {
  it("moves only timed date fields and preserves the rest of the event", () => {
    const event = {
      _id: "event-1",
      endDate: "2026-05-12T10:30:00",
      isAllDay: false,
      priority: "work",
      startDate: "2026-05-12T09:00:00",
      title: "Design review",
      user: "user-1",
    } as Schema_GridEvent;
    const visual = {
      dayIndex: 3,
      durationMinutes: 90,
      endMinutes: 12 * 60,
      eventId: "event-1",
      initialDayIndex: 2,
      initialEndMinutes: 10 * 60 + 30,
      initialStartMinutes: 9 * 60,
      pointerStart: { x: 100, y: 100 },
      sourceRect: { height: 90, left: 100, top: 100, width: 80 },
      startMinutes: 10 * 60 + 30,
      transform: { x: 100, y: 90 },
      type: "timedDrag",
      weekOffsetDays: 0,
    } satisfies TimedDragVisual;

    const moved = visualDraftToGridEvent(event, visual);

    expect(moved).toMatchObject({
      _id: "event-1",
      isAllDay: false,
      priority: "work",
      title: "Design review",
      user: "user-1",
    });
    expect(moved.startDate).toContain("2026-05-13T10:30:00");
    expect(moved.endDate).toContain("2026-05-13T12:00:00");
    expect(hasTimedDragVisualMoved(visual)).toBe(true);
  });

  it("detects unchanged visual drafts", () => {
    const visual = {
      dayIndex: 2,
      durationMinutes: 60,
      endMinutes: 11 * 60,
      eventId: "event-1",
      initialDayIndex: 2,
      initialEndMinutes: 11 * 60,
      initialStartMinutes: 10 * 60,
      pointerStart: { x: 100, y: 100 },
      sourceRect: { height: 60, left: 100, top: 100, width: 80 },
      startMinutes: 10 * 60,
      transform: { x: 0, y: 0 },
      type: "timedDrag",
      weekOffsetDays: 0,
    } satisfies TimedDragVisual;

    expect(hasTimedDragVisualMoved(visual)).toBe(false);
  });

  it("applies edge-navigation week offsets", () => {
    const event = {
      _id: "event-1",
      endDate: "2026-05-16T11:00:00",
      isAllDay: false,
      startDate: "2026-05-16T10:00:00",
    } as Schema_GridEvent;
    const visual = {
      dayIndex: 6,
      durationMinutes: 60,
      endMinutes: 11 * 60,
      eventId: "event-1",
      initialDayIndex: 6,
      initialEndMinutes: 11 * 60,
      initialStartMinutes: 10 * 60,
      pointerStart: { x: 100, y: 100 },
      sourceRect: { height: 60, left: 600, top: 100, width: 80 },
      startMinutes: 10 * 60,
      transform: { x: 0, y: 0 },
      type: "timedDrag",
      weekOffsetDays: 7,
    } satisfies TimedDragVisual;

    const moved = visualDraftToGridEvent(event, visual);

    expect(moved.startDate).toContain("2026-05-23T10:00:00");
    expect(hasTimedDragVisualMoved(visual)).toBe(true);
  });
});
