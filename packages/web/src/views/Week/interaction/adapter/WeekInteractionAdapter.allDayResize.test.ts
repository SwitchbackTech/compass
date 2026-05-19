import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { createWeekInteractionAdapter } from "@web/views/Week/interaction/adapter/WeekInteractionAdapter";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import { afterEach, describe, expect, it, mock } from "bun:test";

const createAllDayEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "all-day-event",
    endDate: "2026-05-15",
    isAllDay: true,
    position: {
      height: 100,
      left: 200,
      maxWidth: 100,
      order: 0,
      top: 900,
      width: 100,
    },
    priority: "none",
    row: 1,
    startDate: "2026-05-13",
    title: "All-day event",
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
  eventOverrides,
  isPending = false,
  sourceRect = {
    height: 20,
    left: 400,
    top: 25,
    width: 190,
  },
}: {
  eventOverrides?: Partial<Schema_GridEvent>;
  isPending?: boolean;
  sourceRect?: Pick<DOMRect, "height" | "left" | "top" | "width">;
} = {}) => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();

  let now = 100;
  let nextFrameId = 1;
  const frameCallbacks = new Map<unknown, FrameRequestCallback>();
  const timerCallbacks = new Map<unknown, () => void>();
  const event = createAllDayEvent(eventOverrides);
  const source = document.createElement("div");
  const startHandle = document.createElement("div");
  const endHandle = document.createElement("div");
  const mainGrid = document.createElement("div");
  const allDayColumns = document.createElement("div");
  const onClickAllDayEvent = mock();
  const onCommitAllDayResize = mock();
  const onMotionActivation = mock();

  source.style.visibility = "visible";
  startHandle.setAttribute("data-week-event-resize-handle", "startDate");
  endHandle.setAttribute("data-week-event-resize-handle", "endDate");
  mainGrid.id = ID_GRID_MAIN;
  allDayColumns.id = ID_ALLDAY_COLUMNS;
  source.append(startHandle, endHandle);
  allDayColumns.append(source);
  document.body.append(mainGrid, allDayColumns);

  setRect(mainGrid, {
    height: 1300,
    left: 50,
    top: 100,
    width: 750,
  });
  setRect(allDayColumns, {
    height: 40,
    left: 100,
    top: 20,
    width: 700,
  });
  setRect(source, sourceRect);

  weekEventRegistry.register({
    element: source,
    eventId: event._id!,
    eventType: "all-day",
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
      getAllDayEventById: (eventId) => (eventId === event._id ? event : null),
      getTimedEventById: () => null,
      isEventPending: () => isPending,
      onClickAllDayEvent,
      onClickTimedEvent: () => undefined,
      onCommitAllDayResize,
      onCommitTimedDrag: () => undefined,
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

  return {
    adapter,
    endHandle,
    event,
    flushFrame,
    onClickAllDayEvent,
    onCommitAllDayResize,
    onMotionActivation,
    source,
    startHandle,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();
});

describe("WeekInteractionAdapter all-day resize", () => {
  it("owns a saved all-day resize handle and routes quick release as a click", () => {
    const {
      adapter,
      endHandle,
      event,
      onClickAllDayEvent,
      onCommitAllDayResize,
    } = createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: endHandle,
          x: 490,
          y: 30,
        }),
      ),
    ).toEqual({
      reason: "saved-all-day-resize",
      shouldOwn: true,
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 490, y: 30 }),
    );

    expect(onClickAllDayEvent).toHaveBeenCalledWith(event);
    expect(onCommitAllDayResize).not.toHaveBeenCalled();
  });

  it("keeps pending all-day resize handles on the existing Week path", () => {
    const { adapter, endHandle } = createHarness({ isPending: true });

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: endHandle,
          x: 490,
          y: 30,
        }),
      ),
    ).toEqual({
      reason: "no-week-interaction-target",
      shouldOwn: false,
    });
  });

  it("commits an activated no-op all-day resize as not moved", () => {
    const { adapter, endHandle, flushFrame, onCommitAllDayResize } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 490, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 525, y: 30 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 525, y: 30 }),
    );

    expect(onCommitAllDayResize).toHaveBeenCalledWith(
      expect.objectContaining({
        hasMoved: false,
        type: "allDayResizeEnd",
      }),
    );
  });

  it("resizes the right edge with immediate width writes and exclusive end-date commit", () => {
    const {
      adapter,
      endHandle,
      flushFrame,
      onCommitAllDayResize,
      onMotionActivation,
      source,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 490, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 655, y: 30 }),
    );

    expect(source.style.visibility).toBe("hidden");
    expect(onMotionActivation).toHaveBeenCalled();

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transition).toBe("none");
    expect(overlay?.style.transform).toBe("translate3d(0px, 0px, 0)");
    expect(overlay?.style.width).toBe("290px");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 655, y: 30 }),
    );

    expect(onCommitAllDayResize).toHaveBeenCalledTimes(1);
    expect(onCommitAllDayResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-16",
          startDate: "2026-05-13",
        }),
        hasMoved: true,
        type: "allDayResizeEnd",
      }),
    );
    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
  });

  it("resizes the left edge and flips through a one-day minimum", () => {
    const { adapter, flushFrame, onCommitAllDayResize, startHandle } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: startHandle, x: 400, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: startHandle, x: 655, y: 30 }),
    );
    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transform).toBe("translate3d(100px, 0px, 0)");
    expect(overlay?.style.width).toBe("190px");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: startHandle, x: 655, y: 30 }),
    );

    expect(onCommitAllDayResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-16",
          startDate: "2026-05-14",
        }),
        hasMoved: true,
      }),
    );
  });

  it("normalizes legacy same-day end dates only after visible resize motion", () => {
    const { adapter, endHandle, flushFrame, onCommitAllDayResize } =
      createHarness({
        eventOverrides: {
          endDate: "2026-05-13",
          startDate: "2026-05-13",
        },
        sourceRect: {
          height: 20,
          left: 400,
          top: 25,
          width: 90,
        },
      });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 490, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 555, y: 30 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 555, y: 30 }),
    );

    expect(onCommitAllDayResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-15",
          startDate: "2026-05-13",
        }),
        hasMoved: true,
      }),
    );
  });

  it("restores the source element and overlay when all-day resize is cancelled", () => {
    const { adapter, endHandle, flushFrame, onCommitAllDayResize, source } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 490, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 655, y: 30 }),
    );
    flushFrame();

    expect(source.style.visibility).toBe("hidden");
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeTruthy();

    adapter.handlePointerCancel(
      makePointerEvent("pointercancel", { target: endHandle, x: 655, y: 30 }),
    );

    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
    expect(onCommitAllDayResize).not.toHaveBeenCalled();
  });

  it("resizes the visible right edge of a clipped all-day event without dropping its hidden start", () => {
    const { adapter, endHandle, flushFrame, onCommitAllDayResize } =
      createHarness({
        eventOverrides: {
          endDate: "2026-05-13",
          startDate: "2026-05-09",
        },
        sourceRect: {
          height: 20,
          left: 100,
          top: 25,
          width: 290,
        },
      });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: endHandle, x: 390, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: endHandle, x: 455, y: 30 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: endHandle, x: 455, y: 30 }),
    );

    expect(onCommitAllDayResize).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-14",
          startDate: "2026-05-09",
        }),
        hasMoved: true,
      }),
    );
  });
});
