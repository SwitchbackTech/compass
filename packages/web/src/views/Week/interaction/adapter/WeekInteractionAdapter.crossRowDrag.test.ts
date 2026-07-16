import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { createWeekInteractionAdapter } from "@web/views/Week/interaction/adapter/WeekInteractionAdapter";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import { resetWeekInteractionEdgeNavigationState } from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { afterEach, describe, expect, it, mock } from "bun:test";

// Geometry, shared by every case below:
//   all-day row  y  20..60
//   timed grid   y 100..1400, 13 visible hours -> 5/3 px per minute
//   day columns  x 100..800, 100px each, 2026-05-10 (col 0) .. 2026-05-16 (col 6)
// Both rows' columns are aligned, as they are on screen.
const VISIBLE_DAYS = [
  "2026-05-10",
  "2026-05-11",
  "2026-05-12",
  "2026-05-13",
  "2026-05-14",
  "2026-05-15",
  "2026-05-16",
];

const PIXELS_PER_MINUTE = 1300 / (13 * 60);

const createAllDayEvent = (): GridEvent =>
  ({
    _id: "all-day-event",
    // Single day on the 13th: all-day ends are exclusive.
    endDate: "2026-05-14",
    isAllDay: true,
    position: {},
    row: 1,
    startDate: "2026-05-13",
    title: "All-day event",
    user: "user-1",
  }) as GridEvent;

const createTimedEvent = (): GridEvent =>
  ({
    _id: "timed-event",
    endDate: "2026-05-13T10:00:00.000",
    isAllDay: false,
    position: {},
    startDate: "2026-05-13T09:00:00.000",
    title: "Timed event",
    user: "user-1",
  }) as GridEvent;

const setRect = (
  element: HTMLElement,
  rect: Pick<DOMRect, "height" | "left" | "top" | "width">,
) => {
  const domRect = {
    ...rect,
    bottom: rect.top + rect.height,
    right: rect.left + rect.width,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect;

  element.getBoundingClientRect = () => domRect;
};

const makePointerEvent = (
  type: string,
  { target, x, y }: { target: EventTarget; x: number; y: number },
) => {
  const event = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    isPrimary: true,
    pointerId: 1,
  });

  Object.defineProperty(event, "target", { value: target });

  return event;
};

const createHarness = ({
  row,
  sourceRect,
}: {
  row: "allDay" | "timed";
  sourceRect: Pick<DOMRect, "height" | "left" | "top" | "width">;
}) => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();

  let now = 100;
  let nextFrameId = 1;
  const frameCallbacks = new Map<unknown, FrameRequestCallback>();
  const timerCallbacks = new Map<unknown, () => void>();
  const event = row === "allDay" ? createAllDayEvent() : createTimedEvent();
  const source = document.createElement("div");
  const child = document.createElement("span");
  const mainGrid = document.createElement("div");
  const timedColumns = document.createElement("div");
  const allDayColumns = document.createElement("div");
  const onCommitAllDayDrag = mock();
  const onCommitTimedDrag = mock();

  source.style.visibility = "visible";
  mainGrid.id = ID_GRID_MAIN;
  timedColumns.id = ID_GRID_COLUMNS_TIMED;
  allDayColumns.id = ID_ALLDAY_COLUMNS;
  source.append(child);
  mainGrid.append(timedColumns);
  (row === "allDay" ? allDayColumns : timedColumns).append(source);
  document.body.append(mainGrid, allDayColumns);
  Object.defineProperty(mainGrid, "clientHeight", { value: 1300 });
  Object.defineProperty(mainGrid, "scrollHeight", { value: 2600 });
  mainGrid.scrollTop = 0;

  setRect(mainGrid, { height: 1300, left: 50, top: 100, width: 750 });
  setRect(timedColumns, { height: 1300, left: 100, top: 100, width: 700 });
  setRect(allDayColumns, { height: 40, left: 100, top: 20, width: 700 });
  setRect(source, sourceRect);

  weekEventRegistry.register({
    element: source,
    eventId: event._id!,
    eventType: row === "allDay" ? "all-day" : "timed",
  });

  const adapter = createWeekInteractionAdapter({
    engineOptions: {
      cancelFrame: (frame) => frameCallbacks.delete(frame),
      clearTimer: (timer) => timerCallbacks.delete(timer),
      now: () => now,
      requestFrame: (callback) => {
        const frameId = nextFrameId;

        nextFrameId += 1;
        frameCallbacks.set(frameId, callback);

        return frameId;
      },
      setTimer: (callback) => {
        const timer = Symbol("timer");

        timerCallbacks.set(timer, callback);

        return timer;
      },
    },
    runtime: () => ({
      getAllDayEventById: (eventId) =>
        row === "allDay" && eventId === event._id ? event : null,
      getTimedEventById: (eventId) =>
        row === "timed" && eventId === event._id ? event : null,
      getVisibleDays: () => VISIBLE_DAYS,
      onClickTimedEvent: () => undefined,
      onCommitAllDayDrag,
      onCommitTimedDrag,
    }),
  });

  const flushFrame = (timestamp = 16) => {
    const [[frameId, callback]] = frameCallbacks;

    if (!callback) {
      throw new Error("Expected a frame callback to be scheduled");
    }

    frameCallbacks.delete(frameId);
    now += 8;
    callback(timestamp);
  };

  const getDraftEvent = () =>
    document.body.querySelector(
      "[data-calendar-draft-event]",
    ) as HTMLElement | null;

  return {
    adapter,
    child,
    event,
    flushFrame,
    getDraftEvent,
    onCommitAllDayDrag,
    onCommitTimedDrag,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();
  resetWeekInteractionEdgeNavigationState();
});

describe("WeekInteractionAdapter all-day -> timed drag", () => {
  // The all-day chip sits on col 3 (2026-05-13).
  const sourceRect = { height: 20, left: 400, top: 25, width: 100 };

  it("converts a dropped all-day event into a default-length timed event at the drop position", () => {
    const { adapter, child, flushFrame, onCommitAllDayDrag } = createHarness({
      row: "allDay",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 30 }),
    );
    // y 600 is 500px below the grid top -> 300 minutes -> 05:00.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 600 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 430, y: 600 }),
    );

    expect(onCommitAllDayDrag).toHaveBeenCalledTimes(1);
    expect(onCommitAllDayDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          _id: "all-day-event",
          endDate: expect.stringContaining("06:00"),
          isAllDay: false,
          startDate: expect.stringContaining("05:00"),
        }),
        hasMoved: true,
        type: "allDayDragEnd",
      }),
    );
    expect(onCommitAllDayDrag.mock.calls[0][0].event.startDate).toContain(
      "2026-05-13",
    );
  });

  it("lands the converted event on the column under the pointer", () => {
    const { adapter, child, flushFrame, onCommitAllDayDrag } = createHarness({
      row: "allDay",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 30 }),
    );
    // x 630 is inside col 5 (2026-05-15).
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 630, y: 600 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 630, y: 600 }),
    );

    expect(onCommitAllDayDrag.mock.calls[0][0].event.startDate).toContain(
      "2026-05-15",
    );
  });

  it("counts a same-day drop into the grid as a change, since the event gains a time", () => {
    const { adapter, child, flushFrame, onCommitAllDayDrag } = createHarness({
      row: "allDay",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 600 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 430, y: 600 }),
    );

    expect(onCommitAllDayDrag.mock.calls[0][0].hasMoved).toBe(true);
    expect(onCommitAllDayDrag.mock.calls[0][0].event.isAllDay).toBe(false);
  });

  it("previews the drop as a default-length block, freeing the vertical transform", () => {
    const { adapter, child, flushFrame, getDraftEvent } = createHarness({
      row: "allDay",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 600 }),
    );
    flushFrame();

    const draftEvent = getDraftEvent();

    // Ghost top lands on the snapped 05:00 start: grid top 100 + 500px - the
    // chip's own top of 25.
    expect(draftEvent?.style.transform).toBe("translate3d(0px, 575px, 0)");
    expect(draftEvent?.style.height).toBe(`${60 * PIXELS_PER_MINUTE}px`);
    expect(draftEvent?.style.width).toBe("100px");
    expect(draftEvent?.textContent).toContain("5");
  });

  it("restores the chip's own box and horizontal lock when dragged back to the all-day row", () => {
    const { adapter, child, flushFrame, getDraftEvent, onCommitAllDayDrag } =
      createHarness({ row: "allDay", sourceRect });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 600 }),
    );
    flushFrame();
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 530, y: 30 }),
    );
    flushFrame();

    const draftEvent = getDraftEvent();

    expect(draftEvent?.style.height).toBe("20px");
    expect(draftEvent?.style.width).toBe("100px");
    // Back to the all-day row's column snapping, with no vertical movement.
    expect(draftEvent?.style.transform).toBe("translate3d(100px, 0px, 0)");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 530, y: 30 }),
    );

    expect(onCommitAllDayDrag.mock.calls[0][0].event).toEqual(
      expect.objectContaining({
        endDate: "2026-05-15",
        isAllDay: true,
        startDate: "2026-05-14",
      }),
    );
  });
});

describe("WeekInteractionAdapter timed -> all-day drag", () => {
  // The timed card sits on col 3 (2026-05-13), 09:00-10:00.
  const sourceRect = { height: 100, left: 400, top: 600, width: 100 };

  it("converts a dropped timed event into a one-day all-day event with an exclusive end", () => {
    const { adapter, child, flushFrame, onCommitTimedDrag } = createHarness({
      row: "timed",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 650 }),
    );
    // x 630 is inside col 5 (2026-05-15); y 40 is inside the all-day row.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 630, y: 40 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 630, y: 40 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledTimes(1);
    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          _id: "timed-event",
          endDate: "2026-05-16",
          isAllDay: true,
          startDate: "2026-05-15",
        }),
        hasMoved: true,
        type: "timedDragEnd",
      }),
    );
  });

  it("counts a same-day drop into the all-day row as a change, since the event loses its time", () => {
    const { adapter, child, flushFrame, onCommitTimedDrag } = createHarness({
      row: "timed",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 650 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 40 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 430, y: 40 }),
    );

    expect(onCommitTimedDrag.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-14",
          isAllDay: true,
          startDate: "2026-05-13",
        }),
        hasMoved: true,
      }),
    );
  });

  it("previews the drop as an all-day chip and drops the times it is about to lose", () => {
    const { adapter, child, flushFrame, getDraftEvent } = createHarness({
      row: "timed",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 650 }),
    );
    // Move within the grid first so the ghost picks up a time label.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 700 }),
    );
    flushFrame();

    expect(getDraftEvent()?.textContent).toContain("10");

    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 630, y: 40 }),
    );
    flushFrame();

    const draftEvent = getDraftEvent();

    expect(draftEvent?.style.height).toBe("20px");
    expect(draftEvent?.style.width).toBe("100px");
    // Onto col 5's left edge (600) and the all-day row's top (20).
    expect(draftEvent?.style.transform).toBe("translate3d(200px, -580px, 0)");

    const timeLabel = draftEvent?.querySelector(
      "[data-calendar-event-time-label]",
    ) as HTMLElement | null;

    expect(timeLabel?.style.display).toBe("none");
  });

  it("still drags normally within the timed grid", () => {
    const { adapter, child, flushFrame, onCommitTimedDrag } = createHarness({
      row: "timed",
      sourceRect,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 430, y: 650 }),
    );
    // 100px down -> 60 minutes at 5/3 px per minute.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 750 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 430, y: 750 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("11:00"),
          isAllDay: false,
          startDate: expect.stringContaining("10:00"),
        }),
        hasMoved: true,
      }),
    );
  });
});
