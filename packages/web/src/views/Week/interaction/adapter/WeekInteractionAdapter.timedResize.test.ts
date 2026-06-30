import {
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { createWeekInteractionAdapter } from "@web/views/Week/interaction/adapter/WeekInteractionAdapter";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import {
  getWeekInteractionEdgeNavigationState,
  resetWeekInteractionEdgeNavigationState,
} from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { afterEach, describe, expect, it, mock } from "bun:test";

const createTimedEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "timed-event",
    endDate: "2026-05-19T10:00:00.000",
    isAllDay: false,
    position: {
      height: 100,
      left: 200,
      maxWidth: 100,
      order: 0,
      top: 900,
      width: 100,
    },
    priority: "none",
    startDate: "2026-05-19T09:00:00.000",
    title: "Timed event",
    user: "user-1",
    ...overrides,
  }) as Schema_GridEvent;

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
  {
    isPrimary = true,
    pointerId = 1,
    target,
    x = 0,
    y = 0,
  }: {
    isPrimary?: boolean;
    pointerId?: number;
    target: EventTarget;
    x?: number;
    y?: number;
  },
) => {
  const event = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    isPrimary,
    pointerId,
  });

  Object.defineProperty(event, "target", { value: target });

  return event;
};

const createHarness = ({
  isPending = false,
  mainGridScrollTop = 0,
}: {
  isPending?: boolean;
  mainGridScrollTop?: number;
} = {}) => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();

  let now = 100;
  let nextFrameId = 1;
  const frameCallbacks = new Map<unknown, FrameRequestCallback>();
  const timerCallbacks = new Map<unknown, () => void>();
  const event = createTimedEvent();
  const source = document.createElement("div");
  const startHandle = document.createElement("div");
  const endHandle = document.createElement("div");
  const mainGrid = document.createElement("div");
  const columns = document.createElement("div");
  const onClickTimedEvent = mock();
  const onCommitTimedDrag = mock();
  const onCommitTimedResize = mock();
  const onMotionActivation = mock();

  source.style.visibility = "visible";
  startHandle.setAttribute("data-calendar-event-resize-handle", "startDate");
  endHandle.setAttribute("data-calendar-event-resize-handle", "endDate");
  mainGrid.id = ID_GRID_MAIN;
  columns.id = ID_GRID_COLUMNS_TIMED;
  source.append(startHandle, endHandle);
  mainGrid.append(columns, source);
  document.body.append(mainGrid);
  Object.defineProperty(mainGrid, "clientHeight", { value: 1300 });
  Object.defineProperty(mainGrid, "scrollHeight", { value: 2600 });
  mainGrid.scrollTop = mainGridScrollTop;

  setRect(mainGrid, {
    height: 1300,
    left: 50,
    top: 100,
    width: 750,
  });
  setRect(columns, {
    height: 2400,
    left: 100,
    top: 100,
    width: 700,
  });
  setRect(source, {
    height: 100,
    left: 300,
    top: 1000,
    width: 90,
  });

  weekEventRegistry.register({
    element: source,
    eventId: event._id!,
    eventType: "timed",
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
      getTimedEventById: (eventId) => (eventId === event._id ? event : null),
      isEventPending: () => isPending,
      onClickTimedEvent,
      onCommitTimedDrag,
      onCommitTimedResize,
      onMotionActivation,
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

  const fireHoldTimer = () => {
    const [[timerId, callback]] = timerCallbacks;

    if (!callback) {
      throw new Error("Expected a hold timer to be scheduled");
    }

    timerCallbacks.delete(timerId);
    callback();
  };

  return {
    adapter,
    endHandle,
    event,
    fireHoldTimer,
    flushFrame,
    mainGrid,
    onClickTimedEvent,
    onCommitTimedDrag,
    onCommitTimedResize,
    onMotionActivation,
    source,
    startHandle,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();
  resetWeekInteractionEdgeNavigationState();
});

describe("WeekInteractionAdapter timed resize", () => {
  it("owns a saved timed resize handle and routes quick release as a click", () => {
    const {
      adapter,
      endHandle,
      event,
      onClickTimedEvent,
      onCommitTimedDrag,
      onCommitTimedResize,
    } = createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: endHandle,
          x: 320,
          y: 1100,
        }),
      ),
    ).toEqual({
      reason: "saved-timed-resize",
      shouldOwn: true,
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 320, y: 1100 }),
    );

    expect(onClickTimedEvent).toHaveBeenCalledWith(event);
    expect(onCommitTimedDrag).not.toHaveBeenCalled();
    expect(onCommitTimedResize).not.toHaveBeenCalled();
  });

  it("keeps pending timed resize handles on the existing Week path", () => {
    const { adapter, endHandle } = createHarness({ isPending: true });

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: endHandle,
          x: 320,
          y: 1100,
        }),
      ),
    ).toEqual({
      reason: "no-week-interaction-target",
      shouldOwn: false,
    });
  });

  it("resizes the bottom edge with immediate height writes and commits once", () => {
    const {
      adapter,
      endHandle,
      flushFrame,
      onCommitTimedResize,
      onMotionActivation,
      source,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 320, y: 1150 }),
    );

    expect(source.style.visibility).toBe("hidden");
    expect(onMotionActivation).toHaveBeenCalled();

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transition).toBe("none");
    expect(overlay?.style.transform).toBe("translate3d(0px, 0px, 0)");
    expect(overlay?.style.height).toBe("150px");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 320, y: 1150 }),
    );

    expect(onCommitTimedResize).toHaveBeenCalledTimes(1);
    expect(onCommitTimedResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("10:30"),
          startDate: expect.stringContaining("09:00"),
        }),
        hasMoved: true,
        type: "timedResizeEnd",
      }),
    );
    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
  });

  it("does not publish drag edge indicators for timed resize gestures", () => {
    const { adapter, endHandle, flushFrame } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 40, y: 1150 }),
    );
    flushFrame();

    expect(getWeekInteractionEdgeNavigationState()).toMatchObject({
      currentEdge: null,
      isDragging: false,
      isTimerActive: false,
      progress: 0,
    });
  });

  it("resizes the top edge with immediate transform and height writes", () => {
    const { adapter, flushFrame, onCommitTimedResize, startHandle } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", {
        target: startHandle,
        x: 320,
        y: 1000,
      }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: startHandle,
        x: 320,
        y: 950,
      }),
    );
    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transition).toBe("none");
    expect(overlay?.style.transform).toBe("translate3d(0px, -50px, 0)");
    expect(overlay?.style.height).toBe("150px");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: startHandle, x: 320, y: 950 }),
    );

    expect(onCommitTimedResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("10:00"),
          startDate: expect.stringContaining("08:30"),
        }),
        hasMoved: true,
        type: "timedResizeEnd",
      }),
    );
  });

  it("flips the bottom edge across the start while keeping one slot minimum", () => {
    const { adapter, endHandle, flushFrame, onCommitTimedResize } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 320, y: 980 }),
    );
    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transform).toBe("translate3d(0px, -25px, 0)");
    expect(overlay?.style.height).toBe("25px");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 320, y: 980 }),
    );

    expect(onCommitTimedResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("09:00"),
          startDate: expect.stringContaining("08:45"),
        }),
        hasMoved: true,
      }),
    );
  });

  it("commits an activated no-op timed resize as not moved", () => {
    const {
      adapter,
      endHandle,
      event,
      fireHoldTimer,
      flushFrame,
      onCommitTimedResize,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    fireHoldTimer();
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 320, y: 1100 }),
    );

    expect(onCommitTimedResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          _id: event._id,
          endDate: expect.stringContaining("10:00"),
          startDate: expect.stringContaining("09:00"),
        }),
        eventId: event._id,
        hasMoved: false,
        type: "timedResizeEnd",
      }),
    );
  });

  it("continues timed smart scroll in the RAF loop while resizing toward the grid edge", () => {
    const { adapter, endHandle, flushFrame, mainGrid, onCommitTimedResize } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 320, y: 1150 }),
    );

    flushFrame(16);
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 320, y: 1290 }),
    );
    flushFrame(32);
    flushFrame(48);

    expect(mainGrid.scrollTop).toBe(20);

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 320, y: 1290 }),
    );

    expect(onCommitTimedResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("12:15"),
          startDate: expect.stringContaining("09:00"),
        }),
      }),
    );
  });

  it("re-syncs the overlay position when the grid scrolls without further pointer movement", () => {
    const { adapter, endHandle, flushFrame, mainGrid } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 320, y: 1150 }),
    );
    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transform).toBe("translate3d(0px, 0px, 0)");
    expect(overlay?.style.height).toBe("150px");

    mainGrid.scrollTop = 100;
    mainGrid.dispatchEvent(new Event("scroll"));
    flushFrame();

    expect(overlay?.style.transform).toBe("translate3d(0px, -100px, 0)");
    expect(overlay?.style.height).toBe("250px");
  });

  it("uses the latest timed grid scroll position when it changes before timed resize commit", () => {
    const { adapter, endHandle, flushFrame, mainGrid, onCommitTimedResize } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 320, y: 1100 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 320, y: 1200 }),
    );

    flushFrame();

    mainGrid.scrollTop = 120;

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 320, y: 1200 }),
    );

    expect(onCommitTimedResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("12:15"),
          startDate: expect.stringContaining("09:00"),
        }),
      }),
    );
  });
});
