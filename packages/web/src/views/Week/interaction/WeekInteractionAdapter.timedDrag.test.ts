import {
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { weekEventRegistry } from "@web/views/Week/interaction/geometry/weekEventRegistry";
import { WeekInteractionAdapter } from "@web/views/Week/interaction/WeekInteractionAdapter";
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
    pointerId = 1,
    target,
    x = 0,
    y = 0,
  }: {
    pointerId?: number;
    target: EventTarget;
    x?: number;
    y?: number;
  },
) => {
  const event = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    pointerId,
  });

  Object.defineProperty(event, "target", { value: target });

  return event;
};

const createHarness = ({ isPending = false }: { isPending?: boolean } = {}) => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();

  let now = 100;
  let nextFrameId = 1;
  const frameCallbacks = new Map<unknown, FrameRequestCallback>();
  const timerCallbacks = new Map<unknown, () => void>();
  const event = createTimedEvent();
  const source = document.createElement("div");
  const child = document.createElement("span");
  const mainGrid = document.createElement("div");
  const columns = document.createElement("div");
  const onClickTimedEvent = mock();
  const onCommitTimedDrag = mock();
  const onMotionActivation = mock();
  const onRequestWeekNavigation = mock();

  source.style.visibility = "visible";
  mainGrid.id = ID_GRID_MAIN;
  columns.id = ID_GRID_COLUMNS_TIMED;
  source.append(child);
  mainGrid.append(columns, source);
  document.body.append(mainGrid);
  Object.defineProperty(mainGrid, "clientHeight", { value: 1300 });
  Object.defineProperty(mainGrid, "scrollHeight", { value: 2600 });
  mainGrid.scrollTop = 0;

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

  const unregister = weekEventRegistry.register({
    element: source,
    eventId: event._id!,
    eventType: "timed",
  });

  const adapter = new WeekInteractionAdapter({
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
    mode: "active",
    runtime: () => ({
      getTimedEventById: (eventId) => (eventId === event._id ? event : null),
      isEventPending: () => isPending,
      now: () => now,
      onClickTimedEvent,
      onCommitTimedDrag,
      onMotionActivation,
      onRequestWeekNavigation,
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
    child,
    event,
    fireHoldTimer,
    flushFrame,
    frameCallbacks,
    mainGrid,
    onClickTimedEvent,
    onCommitTimedDrag,
    onMotionActivation,
    onRequestWeekNavigation,
    source,
    timerCallbacks,
    unregister,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();
});

describe("WeekInteractionAdapter timed drag", () => {
  it("owns a saved timed event pointerdown and routes quick release as a click", () => {
    const { adapter, child, event, onClickTimedEvent, onCommitTimedDrag } =
      createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
      ),
    ).toEqual({
      reason: "saved-timed-drag",
      shouldOwn: true,
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 1020 }),
    );

    expect(onClickTimedEvent).toHaveBeenCalledWith(event);
    expect(onCommitTimedDrag).not.toHaveBeenCalled();
    expect(adapter.getMetrics()).toMatchObject({
      ownedPointerDowns: 1,
      pointerDowns: 1,
      pointerUps: 1,
    });
  });

  it("keeps pending events and resize handles on the existing Week path", () => {
    const { adapter, source } = createHarness();
    const handle = document.createElement("div");

    handle.setAttribute("data-week-event-resize-handle", "endDate");
    source.append(handle);

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", { target: handle, x: 320, y: 1096 }),
      ),
    ).toEqual({
      reason: "no-week-interaction-target",
      shouldOwn: false,
    });

    const pendingHarness = createHarness({ isPending: true });

    expect(
      pendingHarness.adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: pendingHarness.child,
          x: 320,
          y: 1020,
        }),
      ),
    ).toEqual({
      reason: "no-week-interaction-target",
      shouldOwn: false,
    });
  });

  it("commits an activated no-op timed drag as not moved", () => {
    const {
      adapter,
      child,
      event,
      fireHoldTimer,
      flushFrame,
      onCommitTimedDrag,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    fireHoldTimer();
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 1020 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          _id: event._id,
          endDate: expect.stringContaining("10:00"),
          startDate: expect.stringContaining("09:00"),
        }),
        eventId: event._id,
        hadFormOpenBeforeInteraction: false,
        hasMoved: false,
        type: "timedDragEnd",
      }),
    );
  });

  it("drags a timed event on the engine path and commits the snapped event once", () => {
    const {
      adapter,
      child,
      event,
      flushFrame,
      onCommitTimedDrag,
      onMotionActivation,
      source,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 1120 }),
    );

    expect(source.style.visibility).toBe("hidden");
    expect(onMotionActivation).toHaveBeenCalledWith(
      expect.objectContaining({ event }),
    );

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay).toBeTruthy();
    expect(overlay?.style.transition).toBe("none");
    expect(overlay?.style.transform).toBe("translate3d(0px, 100px, 0)");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 1120 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledTimes(1);
    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          _id: event._id,
          endDate: expect.stringContaining("11:00"),
          startDate: expect.stringContaining("10:00"),
        }),
        hadFormOpenBeforeInteraction: false,
        hasMoved: true,
      }),
    );
    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
  });

  it("continues timed smart scroll in the RAF loop and feeds scroll delta into commit time", () => {
    const { adapter, child, flushFrame, mainGrid, onCommitTimedDrag } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 1120 }),
    );

    flushFrame(16);
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 1290 }),
    );
    flushFrame(32);
    flushFrame(48);

    expect(mainGrid.scrollTop).toBe(20);

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 1290 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          startDate: expect.stringContaining("12:00"),
        }),
      }),
    );
  });

  it("requests one timed edge navigation after the edge dwell", () => {
    const { adapter, child, flushFrame, onRequestWeekNavigation } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 40, y: 1020 }),
    );

    flushFrame(16);
    flushFrame(600);

    expect(onRequestWeekNavigation).toHaveBeenCalledTimes(1);
    expect(onRequestWeekNavigation).toHaveBeenCalledWith("prev");
  });
});
