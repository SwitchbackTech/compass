import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { createWeekInteractionAdapter } from "@web/views/Week/interaction/adapter/WeekInteractionAdapter";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import { resetWeekInteractionEdgeNavigationState } from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { afterEach, describe, expect, it, mock } from "bun:test";

const createAllDayEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "all-day-event",
    endDate: "2026-05-14",
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
    button,
    buttons,
    ctrlKey,
    isPrimary = true,
    pointerId = 1,
    target,
    x = 0,
    y = 0,
  }: {
    pointerId?: number;
    button?: number;
    buttons?: number;
    ctrlKey?: boolean;
    isPrimary?: boolean;
    target: EventTarget;
    x?: number;
    y?: number;
  },
) => {
  const event = new PointerEvent(type, {
    button,
    buttons,
    clientX: x,
    clientY: y,
    ctrlKey,
    isPrimary,
    pointerId,
  });

  Object.defineProperty(event, "target", { value: target });

  return event;
};

const SOURCE_ELEMENT_INTERACTION_ATTRIBUTE = "data-calendar-interaction-source";

const expectSourceDimmed = (source: HTMLElement) => {
  expect(source.style.visibility).toBe("visible");
  expect(source.style.opacity).toBe("0.5");
  expect(source.style.pointerEvents).toBe("none");
  expect(source).toHaveAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE);
};

const expectSourceRestored = (source: HTMLElement) => {
  expect(source.style.visibility).toBe("visible");
  expect(source.style.opacity).toBe("");
  expect(source.style.pointerEvents).toBe("");
  expect(source).not.toHaveAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE);
};

const createHarness = ({
  eventOverrides,
  isPending = false,
  sourceRect = {
    height: 20,
    left: 300,
    top: 25,
    width: 90,
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
  const child = document.createElement("span");
  const mainGrid = document.createElement("div");
  const allDayColumns = document.createElement("div");
  const onClickAllDayEvent = mock();
  const onCommitAllDayDrag = mock();
  const onMotionActivation = mock();
  const onRequestWeekNavigation = mock();

  source.style.visibility = "visible";
  mainGrid.id = ID_GRID_MAIN;
  allDayColumns.id = ID_ALLDAY_COLUMNS;
  source.append(child);
  allDayColumns.append(source);
  document.body.append(mainGrid, allDayColumns);
  Object.defineProperty(mainGrid, "clientHeight", { value: 1300 });
  Object.defineProperty(mainGrid, "scrollHeight", { value: 2600 });
  mainGrid.scrollTop = 0;

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
      onCommitAllDayDrag,
      onCommitTimedDrag: () => undefined,
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

  return {
    adapter,
    child,
    event,
    flushFrame,
    onClickAllDayEvent,
    onCommitAllDayDrag,
    onMotionActivation,
    onRequestWeekNavigation,
    source,
    timerCallbacks,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  weekEventRegistry.clear();
  resetWeekInteractionEdgeNavigationState();
});

describe("WeekInteractionAdapter all-day drag", () => {
  it("owns a saved all-day event pointerdown and routes quick release as a click", () => {
    const { adapter, child, event, onClickAllDayEvent, onCommitAllDayDrag } =
      createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", { target: child, x: 320, y: 30 }),
      ),
    ).toEqual({
      reason: "saved-all-day-drag",
      shouldOwn: true,
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 30 }),
    );

    expect(onClickAllDayEvent).toHaveBeenCalledWith(event);
    expect(onCommitAllDayDrag).not.toHaveBeenCalled();
  });

  it("keeps pending all-day events on the existing Week path", () => {
    const pendingHarness = createHarness({ isPending: true });

    expect(
      pendingHarness.adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: pendingHarness.child,
          x: 320,
          y: 30,
        }),
      ),
    ).toEqual({
      reason: "no-week-interaction-target",
      shouldOwn: false,
    });
  });

  it("does not own right-click, non-primary, or modifier pointerdowns", () => {
    const { adapter, child, timerCallbacks } = createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          button: 2,
          buttons: 2,
          target: child,
          x: 430,
          y: 30,
        }),
      ),
    ).toEqual({
      reason: "ineligible-week-pointer",
      shouldOwn: false,
    });
    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          isPrimary: false,
          target: child,
          x: 430,
          y: 30,
        }),
      ),
    ).toEqual({
      reason: "ineligible-week-pointer",
      shouldOwn: false,
    });
    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          ctrlKey: true,
          target: child,
          x: 430,
          y: 30,
        }),
      ),
    ).toEqual({
      reason: "ineligible-week-pointer",
      shouldOwn: false,
    });
    expect(timerCallbacks.size).toBe(0);
  });

  it("commits an activated no-op all-day drag as not moved", () => {
    const { adapter, child, flushFrame, onCommitAllDayDrag } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 360, y: 30 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 360, y: 30 }),
    );

    expect(onCommitAllDayDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        hasMoved: false,
        type: "allDayDragEnd",
      }),
    );
  });

  it("drags an all-day event by visible day column and preserves its exclusive span", () => {
    const {
      adapter,
      child,
      flushFrame,
      onCommitAllDayDrag,
      onMotionActivation,
      source,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 30 }),
    );

    expectSourceDimmed(source);
    expect(onMotionActivation).toHaveBeenCalled();

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay).toBeTruthy();
    expect(overlay?.style.transition).toBe("none");
    expect(overlay?.style.transform).toBe("translate3d(100px, 0px, 0)");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 430, y: 30 }),
    );

    expect(onCommitAllDayDrag).toHaveBeenCalledTimes(1);
    expect(onCommitAllDayDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-15",
          startDate: "2026-05-14",
        }),
        hasMoved: true,
        type: "allDayDragEnd",
      }),
    );
    expectSourceRestored(source);
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
  });

  it("requests one all-day edge navigation after the edge dwell", () => {
    const { adapter, child, flushFrame, onRequestWeekNavigation } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 790, y: 30 }),
    );

    flushFrame(16);
    flushFrame(600);

    expect(onRequestWeekNavigation).toHaveBeenCalledTimes(1);
    expect(onRequestWeekNavigation).toHaveBeenCalledWith("next");
  });

  it("resets all-day edge dwell after leaving the edge zone", () => {
    const { adapter, child, flushFrame, onRequestWeekNavigation } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 790, y: 30 }),
    );
    flushFrame(16);
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 400, y: 30 }),
    );
    flushFrame(600);

    expect(onRequestWeekNavigation).not.toHaveBeenCalled();
  });

  it("restores the source element and overlay when all-day drag is cancelled", () => {
    const { adapter, child, flushFrame, onCommitAllDayDrag, source } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 30 }),
    );
    flushFrame();

    expectSourceDimmed(source);
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeTruthy();

    adapter.handlePointerCancel(
      makePointerEvent("pointercancel", { target: child, x: 430, y: 30 }),
    );

    expectSourceRestored(source);
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
    expect(onCommitAllDayDrag).not.toHaveBeenCalled();
  });

  it("drags a clipped all-day event from its visible column without corrupting its hidden span", () => {
    const { adapter, child, flushFrame, onCommitAllDayDrag } = createHarness({
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
      makePointerEvent("pointerdown", { target: child, x: 150, y: 30 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 260, y: 30 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 260, y: 30 }),
    );

    expect(onCommitAllDayDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: "2026-05-14",
          startDate: "2026-05-10",
        }),
        hasMoved: true,
      }),
    );
  });
});
