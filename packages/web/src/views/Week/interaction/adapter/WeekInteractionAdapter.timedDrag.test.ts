import { Categories_Event } from "@core/types/event.types";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { somedayDropTargetRegistry } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry";
import { somedayEventRegistry } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
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
    button,
    buttons,
    isPrimary = true,
    metaKey,
    pointerId = 1,
    shiftKey,
    target,
    x = 0,
    y = 0,
  }: {
    pointerId?: number;
    button?: number;
    buttons?: number;
    isPrimary?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
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
    isPrimary,
    metaKey,
    pointerId,
    shiftKey,
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
  isPending = false,
  mainGridScrollTop = 0,
  sourceRect = {
    height: 100,
    left: 300,
    top: 1000,
    width: 90,
  },
}: {
  isPending?: boolean;
  mainGridScrollTop?: number;
  sourceRect?: Pick<DOMRect, "height" | "left" | "top" | "width">;
} = {}) => {
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
  const allDayColumns = document.createElement("div");
  const columns = document.createElement("div");
  const sidebarWeek = document.createElement("div");
  const onClickTimedEvent = mock();
  const onCommitCalendarToSidebar = mock();
  const onCommitTimedDrag = mock();
  const onMotionActivation = mock();
  const onPreviewCalendarToSidebar = mock();
  const onRequestWeekNavigation = mock();

  source.style.visibility = "visible";
  mainGrid.id = ID_GRID_MAIN;
  allDayColumns.id = ID_ALLDAY_COLUMNS;
  columns.id = ID_GRID_COLUMNS_TIMED;
  source.append(child);
  mainGrid.append(columns, source);
  document.body.append(allDayColumns, mainGrid, sidebarWeek);
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
  setRect(allDayColumns, {
    height: 40,
    left: 100,
    top: 20,
    width: 700,
  });
  setRect(source, sourceRect);
  setRect(sidebarWeek, {
    height: 400,
    left: 900,
    top: 100,
    width: 300,
  });

  const unregister = weekEventRegistry.register({
    element: source,
    eventId: event._id!,
    eventType: "timed",
  });
  const unregisterSidebarWeek = somedayDropTargetRegistry.register({
    category: Categories_Event.SOMEDAY_WEEK,
    element: sidebarWeek,
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
      onCommitCalendarToSidebar,
      onCommitTimedDrag,
      onMotionActivation,
      onPreviewCalendarToSidebar,
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
    onCommitCalendarToSidebar,
    onCommitTimedDrag,
    onMotionActivation,
    onPreviewCalendarToSidebar,
    onRequestWeekNavigation,
    source,
    timerCallbacks,
    unregister,
    unregisterSidebarWeek,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  somedayDropTargetRegistry.clear();
  somedayEventRegistry.clear();
  weekEventRegistry.clear();
  resetWeekInteractionEdgeNavigationState();
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
  });

  it("keeps pending events on the existing Week path", () => {
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

  it("does not own right-click, non-primary, or modifier pointerdowns", () => {
    const { adapter, child, timerCallbacks } = createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          button: 2,
          buttons: 2,
          target: child,
          x: 320,
          y: 1020,
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
          x: 320,
          y: 1020,
        }),
      ),
    ).toEqual({
      reason: "ineligible-week-pointer",
      shouldOwn: false,
    });
    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          metaKey: true,
          target: child,
          x: 320,
          y: 1020,
        }),
      ),
    ).toEqual({
      reason: "ineligible-week-pointer",
      shouldOwn: false,
    });
    expect(timerCallbacks.size).toBe(0);
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

    expectSourceDimmed(source);
    expect(onMotionActivation).toHaveBeenCalledWith(
      expect.objectContaining({ event }),
    );

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay).toBeTruthy();
    expect(overlay?.style.transition).not.toContain("transform");
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
    expectSourceRestored(source);
    expect(
      document.body.querySelector("[data-calendar-interaction-overlay]"),
    ).toBeNull();
  });

  it("converts a timed event to all-day when dragged into the all-day row", () => {
    const { adapter, child, event, flushFrame, onCommitTimedDrag } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 30 }),
    );

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transition).toContain("transform");
    expect(overlay?.style.height).toBe("20px");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 430, y: 30 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          _id: event._id,
          endDate: "2026-05-21",
          isAllDay: true,
          startDate: "2026-05-20",
        }),
        eventId: event._id,
        hasMoved: true,
        type: "timedDragEnd",
      }),
    );
  });

  it("stops smart scrolling once the pointer is over the all-day row", () => {
    const { adapter, child, flushFrame, frameCallbacks, mainGrid } =
      createHarness({ mainGridScrollTop: 600 });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );

    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 120 }),
    );
    flushFrame();

    expect(mainGrid.scrollTop).toBe(590);

    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 30 }),
    );
    flushFrame();

    expect(mainGrid.scrollTop).toBe(590);
    expect(frameCallbacks.size).toBe(0);
  });

  it("restores the timed overlay shape after leaving the all-day row", () => {
    const { adapter, child, flushFrame } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 30 }),
    );
    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.height).toBe("20px");

    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 430, y: 1120 }),
    );
    flushFrame();

    expect(overlay?.style.height).toBe("100px");
    expect(overlay?.style.width).toBe("90px");
    expect(overlay?.style.transition).not.toContain("transform");
  });

  it("does not scroll or dwell-navigate while hovering a sidebar drop zone", () => {
    const {
      adapter,
      child,
      flushFrame,
      mainGrid,
      onCommitCalendarToSidebar,
      onRequestWeekNavigation,
    } = createHarness({ mainGridScrollTop: 600 });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 120 }),
    );
    flushFrame(16);

    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 121 }),
    );
    flushFrame(800);

    expect(mainGrid.scrollTop).toBe(600);
    expect(onRequestWeekNavigation).not.toHaveBeenCalled();
    expect(getWeekInteractionEdgeNavigationState().currentEdge).toBeNull();

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 950, y: 121 }),
    );

    expect(onRequestWeekNavigation).not.toHaveBeenCalled();
    expect(onCommitCalendarToSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        category: Categories_Event.SOMEDAY_WEEK,
        type: "calendarToSidebar",
      }),
    );
  });

  it("previews the Someday sidebar drop zone as the pointer enters, leaves, and commits", () => {
    const { adapter, child, event, flushFrame, onPreviewCalendarToSidebar } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );

    // Enter the sidebar zone -> reports the Week category once.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 150 }),
    );
    flushFrame();
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 170 }),
    );
    flushFrame();

    expect(onPreviewCalendarToSidebar).toHaveBeenCalledTimes(1);
    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith({
      category: Categories_Event.SOMEDAY_WEEK,
      event: expect.objectContaining({ _id: event._id }),
      index: 0,
    });

    // Move back over the grid -> clears the preview.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 800 }),
    );
    flushFrame();

    expect(onPreviewCalendarToSidebar).toHaveBeenCalledTimes(2);
    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith(null);

    // Re-enter then drop -> preview set again, then cleared on commit.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 150 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 950, y: 150 }),
    );

    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith(null);
  });

  it("clears the sidebar preview when the drag is cancelled", () => {
    const { adapter, child, event, flushFrame, onPreviewCalendarToSidebar } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 150 }),
    );
    flushFrame();

    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith({
      category: Categories_Event.SOMEDAY_WEEK,
      event: expect.objectContaining({ _id: event._id }),
      index: 0,
    });

    adapter.cancel();

    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith(null);
  });

  it("commits a timed event to the Someday Week sidebar drop zone", () => {
    const {
      adapter,
      child,
      event,
      flushFrame,
      onCommitCalendarToSidebar,
      onCommitTimedDrag,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 150 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 950, y: 150 }),
    );

    expect(onCommitTimedDrag).not.toHaveBeenCalled();
    expect(onCommitCalendarToSidebar).toHaveBeenCalledWith({
      category: Categories_Event.SOMEDAY_WEEK,
      event,
      eventId: event._id,
      hadFormOpenBeforeInteraction: false,
      index: 0,
      type: "calendarToSidebar",
    });
  });

  it("snaps to the sidebar list instead of the grid in empty space below the list", () => {
    const {
      adapter,
      child,
      event,
      flushFrame,
      onCommitCalendarToSidebar,
      onCommitTimedDrag,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    // x:950 is within the sidebar column (900-1200) but y:620 is below the
    // Week list rect (top 100, bottom 500) — far from the grid.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 620 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 950, y: 620 }),
    );

    expect(onCommitTimedDrag).not.toHaveBeenCalled();
    expect(onCommitCalendarToSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        category: Categories_Event.SOMEDAY_WEEK,
        eventId: event._id,
        type: "calendarToSidebar",
      }),
    );
  });

  it("snaps to the vertically nearest list when between two sidebar lists", () => {
    const { adapter, child, flushFrame, onPreviewCalendarToSidebar } =
      createHarness();
    // Register a second (Month) drop zone stacked below the Week list, leaving
    // a gap between them: Week is y[100,500], Month is y[700,1100].
    const sidebarMonth = document.createElement("div");

    document.body.append(sidebarMonth);
    setRect(sidebarMonth, { height: 400, left: 900, top: 700, width: 300 });
    somedayDropTargetRegistry.register({
      category: Categories_Event.SOMEDAY_MONTH,
      element: sidebarMonth,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );

    // Just below the Week list (gap is 500-700) -> nearer Week.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 540 }),
    );
    flushFrame();
    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: Categories_Event.SOMEDAY_WEEK }),
    );

    // Just above the Month list -> nearer Month.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 950, y: 660 }),
    );
    flushFrame();
    expect(onPreviewCalendarToSidebar).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: Categories_Event.SOMEDAY_MONTH }),
    );
  });

  it("adds a temporary time label while dragging a saved timed event that did not render one", () => {
    const { adapter, child, flushFrame } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 1120 }),
    );

    flushFrame();

    const overlay = document.body.querySelector<HTMLElement>(
      "[data-calendar-interaction-overlay]",
    );
    const timeLabel = overlay?.querySelector<HTMLElement>(
      "[data-calendar-event-time-label='true']",
    );

    expect(timeLabel).toBeTruthy();
    expect(timeLabel?.textContent).toMatch(/10\s+-\s+11 AM/);
    expect(timeLabel?.previousElementSibling).toBe(
      overlay?.querySelector("span"),
    );
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

  it("pins timed drag motion and commit to the visible top of the timed grid", () => {
    const { adapter, child, flushFrame, onCommitTimedDrag } = createHarness({
      mainGridScrollTop: 300,
      sourceRect: {
        height: 100,
        left: 300,
        top: 700,
        width: 90,
      },
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 720 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 20 }),
    );

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transform).toBe("translate3d(0px, -600px, 0)");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 20 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("04:00"),
          startDate: expect.stringContaining("03:00"),
        }),
      }),
    );
  });

  it("pins timed drag motion and commit to the visible bottom of the timed grid", () => {
    const { adapter, child, flushFrame, onCommitTimedDrag } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 320, y: 2200 }),
    );

    flushFrame();

    const overlay = document.body.querySelector(
      "[data-calendar-interaction-overlay]",
    ) as HTMLElement | null;

    expect(overlay?.style.transform).toBe("translate3d(0px, 300px, 0)");

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 320, y: 2200 }),
    );

    expect(onCommitTimedDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          endDate: expect.stringContaining("13:00"),
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

  it("publishes edge indicator state while a saved timed event is dragged", () => {
    const { adapter, child, flushFrame } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 320, y: 1020 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 360, y: 1020 }),
    );
    flushFrame(16);

    expect(getWeekInteractionEdgeNavigationState()).toMatchObject({
      currentEdge: null,
      isDragging: true,
      isTimerActive: false,
      progress: 0,
    });

    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 40, y: 1020 }),
    );
    flushFrame(116);
    flushFrame(216);

    expect(getWeekInteractionEdgeNavigationState()).toMatchObject({
      currentEdge: "left",
      isDragging: true,
      isTimerActive: true,
      progress: 20,
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 40, y: 1020 }),
    );

    expect(getWeekInteractionEdgeNavigationState()).toMatchObject({
      currentEdge: null,
      isDragging: false,
      isTimerActive: false,
      progress: 0,
    });
  });
});
