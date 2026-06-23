import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { gridHoverColorByPriority } from "@web/common/styles/theme.util";
import { createSomedayInteractionAdapter } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/adapter/SomedayInteractionAdapter";
import { somedayDropTargetRegistry } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry";
import { somedayEventRegistry } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { resetWeekInteractionEdgeNavigationState } from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { afterEach, describe, expect, it, mock } from "bun:test";

const createSomedayEvent = (
  overrides: Partial<Schema_Event> = {},
): Schema_Event => ({
  _id: "someday-event",
  endDate: "2026-05-23",
  isSomeday: true,
  order: 0,
  startDate: "2026-05-17",
  title: "Someday event",
  ...overrides,
});

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
    isPrimary = true,
    pointerId = 1,
    target,
    x = 0,
    y = 0,
  }: {
    pointerId?: number;
    button?: number;
    isPrimary?: boolean;
    target: EventTarget;
    x?: number;
    y?: number;
  },
) => {
  const event = new PointerEvent(type, {
    button,
    clientX: x,
    clientY: y,
    isPrimary,
    pointerId,
  });

  Object.defineProperty(event, "target", { value: target });

  return event;
};

const normalizeCssColor = (color: string) => {
  const element = document.createElement("span");

  element.style.color = color;

  return element.style.color;
};

const setReducedMotionPreference = (matches: boolean) => {
  const originalMatchMedia = window.matchMedia;
  const reducedMotionMatchMedia = mock((query: string) => ({
    addEventListener: mock(),
    addListener: mock(),
    dispatchEvent: mock(),
    matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
    media: query,
    onchange: null,
    removeEventListener: mock(),
    removeListener: mock(),
  }));

  window.matchMedia = reducedMotionMatchMedia as typeof window.matchMedia;

  return () => {
    window.matchMedia = originalMatchMedia;
  };
};

const createHarness = ({
  mainGridScrollTop = 0,
  viewStart = dayjs("2026-05-17"),
}: {
  mainGridScrollTop?: number;
  viewStart?: ReturnType<typeof dayjs>;
} = {}) => {
  document.body.innerHTML = "";
  somedayDropTargetRegistry.clear();
  somedayEventRegistry.clear();

  let now = 100;
  let nextFrameId = 1;
  const frameCallbacks = new Map<unknown, FrameRequestCallback>();
  const timerCallbacks = new Map<unknown, () => void>();
  const event = createSomedayEvent();
  const source = document.createElement("div");
  const sourceContent = document.createElement("div");
  const sourceTitleRow = document.createElement("div");
  const sourceChild = document.createElement("span");
  const sourceButton = document.createElement("button");
  const weekDropTarget = document.createElement("div");
  const mainGrid = document.createElement("div");
  const timedColumns = document.createElement("div");
  const allDayColumns = document.createElement("div");
  const onCancelInteraction = mock();
  const onClickSomedayEvent = mock();
  const onCommitSomedayInteraction = mock();
  const onMotionActivation = mock();
  const onPreviewSomedaySidebarDrop = mock();
  const onRequestWeekNavigation = mock();

  sourceButton.type = "button";
  sourceButton.setAttribute("data-someday-drag-affordance", "true");
  sourceContent.className = "h-full";
  sourceTitleRow.setAttribute("data-someday-event-title-row", "true");
  sourceTitleRow.append(sourceChild);
  sourceContent.append(sourceTitleRow, sourceButton);
  source.append(sourceContent);
  weekDropTarget.append(source);
  mainGrid.id = ID_GRID_MAIN;
  timedColumns.id = ID_GRID_COLUMNS_TIMED;
  allDayColumns.id = ID_ALLDAY_COLUMNS;
  mainGrid.append(timedColumns);
  document.body.append(weekDropTarget, allDayColumns, mainGrid);
  Object.defineProperty(mainGrid, "clientHeight", { value: 780 });
  Object.defineProperty(mainGrid, "scrollHeight", { value: 1560 });
  mainGrid.scrollTop = mainGridScrollTop;

  setRect(weekDropTarget, {
    height: 200,
    left: 0,
    top: 0,
    width: 260,
  });
  setRect(source, {
    height: 32,
    left: 8,
    top: 4,
    width: 220,
  });
  setRect(allDayColumns, {
    height: 40,
    left: 100,
    top: 50,
    width: 700,
  });
  setRect(mainGrid, {
    height: 780,
    left: 50,
    top: 100,
    width: 750,
  });
  setRect(timedColumns, {
    height: 780,
    left: 100,
    top: 100,
    width: 700,
  });

  somedayDropTargetRegistry.register({
    category: Categories_Event.SOMEDAY_WEEK,
    element: weekDropTarget,
  });
  somedayEventRegistry.register({
    category: Categories_Event.SOMEDAY_WEEK,
    element: source,
    eventId: event._id!,
    index: 0,
  });

  const adapter = createSomedayInteractionAdapter({
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
    getLayoutSources: () => ({
      allDayColumnsElement: allDayColumns,
      mainGridElement: mainGrid,
      timedColumnsElement: timedColumns,
    }),
    getViewStart: () => viewStart,
    runtime: () => ({
      getSomedayEventById: (eventId) => (eventId === event._id ? event : null),
      onCancelInteraction,
      onClickSomedayEvent,
      onCommitSomedayInteraction,
      onMotionActivation,
      onPreviewSomedaySidebarDrop,
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
    event,
    flushFrame,
    mainGrid,
    onClickSomedayEvent,
    onCommitSomedayInteraction,
    onMotionActivation,
    onPreviewSomedaySidebarDrop,
    onRequestWeekNavigation,
    source,
    sourceButton,
    sourceChild,
    timedColumns,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  somedayDropTargetRegistry.clear();
  somedayEventRegistry.clear();
  resetWeekInteractionEdgeNavigationState();
});

describe("SomedayInteractionAdapter", () => {
  it("owns saved Someday rows and routes quick release as a click", () => {
    const { adapter, event, onClickSomedayEvent, sourceChild } =
      createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: sourceChild,
          x: 20,
          y: 12,
        }),
      ),
    ).toEqual({
      reason: "saved-someday-drag",
      shouldOwn: true,
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: sourceChild, x: 20, y: 12 }),
    );

    expect(onClickSomedayEvent).toHaveBeenCalledWith(
      event,
      Categories_Event.SOMEDAY_WEEK,
    );
  });

  it("leaves action buttons on the normal button path", () => {
    const { adapter, sourceButton } = createHarness();

    expect(
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", {
          target: sourceButton,
          x: 20,
          y: 12,
        }),
      ),
    ).toEqual({
      reason: "no-someday-interaction-target",
      shouldOwn: false,
    });
  });

  it("schedules a dragged Someday event as a one-hour timed event", () => {
    const {
      adapter,
      flushFrame,
      onCommitSomedayInteraction,
      onMotionActivation,
      sourceChild,
      timedColumns,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: timedColumns, x: 250, y: 220 }),
    );

    expect(onMotionActivation).toHaveBeenCalledTimes(1);
    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      dates: {
        endDate: expect.stringContaining("2026-05-18T03:00"),
        startDate: expect.stringContaining("2026-05-18T02:00"),
      },
      eventId: "someday-event",
      isAllDay: false,
      type: "schedule",
    });
  });

  it("accounts for the main grid scroll position when scheduling a timed drop", () => {
    const {
      adapter,
      flushFrame,
      onCommitSomedayInteraction,
      sourceChild,
      timedColumns,
    } = createHarness({ mainGridScrollTop: 120 });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: timedColumns, x: 250, y: 220 }),
    );

    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      dates: {
        endDate: expect.stringContaining("2026-05-18T05:00"),
        startDate: expect.stringContaining("2026-05-18T04:00"),
      },
      eventId: "someday-event",
      isAllDay: false,
      type: "schedule",
    });
  });

  it("uses the latest main grid scroll position when it changes during a timed drag", () => {
    const {
      adapter,
      flushFrame,
      mainGrid,
      onCommitSomedayInteraction,
      sourceChild,
      timedColumns,
    } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();

    mainGrid.scrollTop = 120;

    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: timedColumns, x: 250, y: 220 }),
    );

    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      dates: {
        endDate: expect.stringContaining("2026-05-18T05:00"),
        startDate: expect.stringContaining("2026-05-18T04:00"),
      },
      eventId: "someday-event",
      isAllDay: false,
      type: "schedule",
    });
  });

  it("previews a calendar drop with landed-event styling", () => {
    const { adapter, flushFrame, sourceChild, timedColumns } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();

    const overlay = document.body.querySelector<HTMLElement>(
      "[data-calendar-interaction-overlay]",
    );
    const expectedTextColor = normalizeCssColor(theme.color.text.dark);
    const expectedHoverColor = normalizeCssColor(
      gridHoverColorByPriority[Priorities.UNASSIGNED],
    );

    expect(overlay).toBeTruthy();
    expect(overlay?.style.color).toBe(expectedTextColor);
    expect(overlay?.style.backgroundColor).toBe(expectedHoverColor);
    expect(overlay?.querySelector("[data-someday-drag-affordance]")).toBeNull();
  });

  it("shows the tentative timed-grid range inside the visible Someday preview", () => {
    const { adapter, flushFrame, sourceChild, timedColumns } = createHarness({
      viewStart: dayjs().add(1, "week").startOf("week"),
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();

    const overlay = document.body.querySelector<HTMLElement>(
      "[data-calendar-interaction-overlay]",
    );
    const timeLabel = overlay?.querySelector<HTMLElement>(
      "[data-someday-interaction-time-label]",
    );
    const titleRow = overlay?.querySelector<HTMLElement>(
      "[data-someday-event-title-row]",
    );
    const textStack = titleRow?.parentElement;

    expect(timeLabel).toBeTruthy();
    expect(timeLabel?.textContent).toMatch(/2\s+-\s+3 AM/);
    expect(timeLabel?.style.display).toBe("block");
    expect(timeLabel?.parentElement).toBe(textStack);
    expect(timeLabel?.previousElementSibling).toBe(titleRow);
    expect(textStack?.style.alignItems).toBe("flex-start");
    expect(textStack?.style.display).toBe("flex");
    expect(textStack?.style.flexDirection).toBe("column");
    expect(titleRow?.style.alignSelf).toBe("stretch");
    expect(titleRow?.style.alignItems).toBe("flex-start");
    expect(titleRow?.style.flex).toBe("0 1 auto");
    expect(titleRow?.style.flexDirection).toBe("row");
  });

  it("keeps the tentative timed-grid range visible for past targets", () => {
    const { adapter, flushFrame, sourceChild, timedColumns } = createHarness({
      viewStart: dayjs().subtract(1, "week").startOf("week"),
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();

    const overlay = document.body.querySelector<HTMLElement>(
      "[data-calendar-interaction-overlay]",
    );
    const titleRow = overlay?.querySelector<HTMLElement>(
      "[data-someday-event-title-row]",
    );

    expect(
      overlay?.querySelector("[data-someday-interaction-time-label]")
        ?.textContent,
    ).toMatch(/2\s+-\s+3 AM/);
    expect(
      overlay?.querySelector("[data-someday-interaction-time-label]")
        ?.parentElement,
    ).toBe(titleRow?.parentElement);
    expect(titleRow?.style.alignSelf).toBe("stretch");
    expect(titleRow?.style.alignItems).toBe("flex-start");
    expect(titleRow?.style.flex).toBe("0 1 auto");
    expect(titleRow?.style.flexDirection).toBe("row");
    expect(titleRow?.parentElement?.style.flexDirection).toBe("column");
  });

  it("disables Someday overlay motion when reduced motion is preferred", () => {
    const restoreMatchMedia = setReducedMotionPreference(true);
    const { adapter, flushFrame, sourceChild, timedColumns } = createHarness();

    try {
      adapter.handlePointerDown(
        makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
      );
      adapter.handlePointerMove(
        makePointerEvent("pointermove", {
          target: timedColumns,
          x: 250,
          y: 220,
        }),
      );
      flushFrame();

      const overlay = document.body.querySelector<HTMLElement>(
        "[data-calendar-interaction-overlay]",
      );

      expect(overlay).toBeTruthy();
      expect(overlay?.style.transition).toBe("none");
      expect(overlay?.style.scale).toBe("1");
    } finally {
      restoreMatchMedia();
    }
  });

  it("schedules a dragged Someday event as an all-day event", () => {
    const { adapter, flushFrame, onCommitSomedayInteraction, sourceChild } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: document.body,
        x: 250,
        y: 60,
      }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: document.body, x: 250, y: 60 }),
    );

    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      dates: {
        endDate: "2026-05-19",
        startDate: "2026-05-18",
      },
      eventId: "someday-event",
      isAllDay: true,
      type: "schedule",
    });
  });

  it("clamps a drop over the week header to the nearest all-day slot", () => {
    const { adapter, flushFrame, onCommitSomedayInteraction, sourceChild } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    // (450, 20) is in the dead header band: above the all-day row (top 50),
    // right of the sidebar (right 260). The clamp should land it on the
    // all-day row's nearest column instead of noop-restoring.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: document.body, x: 450, y: 20 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: document.body, x: 450, y: 20 }),
    );

    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      dates: {
        endDate: "2026-05-21",
        startDate: "2026-05-20",
      },
      eventId: "someday-event",
      isAllDay: true,
      type: "schedule",
    });
  });

  it("anchors the preview to the grid while the pointer is over the header", () => {
    const { adapter, flushFrame, sourceChild } = createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: document.body, x: 400, y: 20 }),
    );
    flushFrame();

    const overlay = document.body.querySelector<HTMLElement>(
      "[data-calendar-interaction-overlay]",
    );
    const expectedHoverColor = normalizeCssColor(
      gridHoverColorByPriority[Priorities.UNASSIGNED],
    );

    // Anchored (grid-hover) styling proves the preview snapped to a valid
    // slot rather than floating under the cursor in the header.
    expect(overlay?.style.backgroundColor).toBe(expectedHoverColor);
    expect(overlay?.style.scale).toBe("1");
  });

  it("clamps drags in the gap between the all-day row and the timed grid", () => {
    const { adapter, flushFrame, onCommitSomedayInteraction, sourceChild } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    // y=93 sits between the all-day bottom (90) and the grid top (100);
    // the all-day row is nearer.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: document.body, x: 450, y: 93 }),
    );
    flushFrame();
    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: document.body, x: 450, y: 93 }),
    );

    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      dates: {
        endDate: "2026-05-21",
        startDate: "2026-05-20",
      },
      eventId: "someday-event",
      isAllDay: true,
      type: "schedule",
    });
  });

  it("does not start edge navigation while the pointer is in the header", () => {
    const { adapter, flushFrame, onRequestWeekNavigation, sourceChild } =
      createHarness();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    // Near the grid's right edge horizontally, but in the header band: the
    // clamp must not turn this into a phantom edge dwell.
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: document.body, x: 790, y: 20 }),
    );
    flushFrame();

    expect(onRequestWeekNavigation).not.toHaveBeenCalled();
  });

  it("commits a sidebar reorder through the interaction engine", () => {
    const {
      adapter,
      flushFrame,
      onCommitSomedayInteraction,
      onPreviewSomedaySidebarDrop,
      sourceChild,
    } = createHarness();
    const secondEvent = document.createElement("div");

    setRect(secondEvent, {
      height: 32,
      left: 8,
      top: 44,
      width: 220,
    });
    document.body.append(secondEvent);
    somedayEventRegistry.register({
      category: Categories_Event.SOMEDAY_WEEK,
      element: secondEvent,
      eventId: "second-event",
      index: 1,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: document.body,
        x: 40,
        y: 80,
      }),
    );
    flushFrame();

    expect(onPreviewSomedaySidebarDrop).toHaveBeenCalledWith({
      destination: {
        droppableId: "weekEvents",
        index: 1,
      },
      eventId: "someday-event",
      source: {
        droppableId: "weekEvents",
        index: 0,
      },
      type: "sidebarDrop",
    });

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: document.body, x: 40, y: 80 }),
    );

    expect(onCommitSomedayInteraction).toHaveBeenCalledWith({
      destination: {
        droppableId: "weekEvents",
        index: 1,
      },
      eventId: "someday-event",
      source: {
        droppableId: "weekEvents",
        index: 0,
      },
      type: "sidebarDrop",
    });
  });

  it("clears the sidebar sort preview when the drag moves to the calendar", () => {
    const {
      adapter,
      flushFrame,
      onPreviewSomedaySidebarDrop,
      sourceChild,
      timedColumns,
    } = createHarness();
    const secondEvent = document.createElement("div");

    setRect(secondEvent, {
      height: 32,
      left: 8,
      top: 44,
      width: 220,
    });
    document.body.append(secondEvent);
    somedayEventRegistry.register({
      category: Categories_Event.SOMEDAY_WEEK,
      element: secondEvent,
      eventId: "second-event",
      index: 1,
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: sourceChild, x: 20, y: 12 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: document.body,
        x: 40,
        y: 80,
      }),
    );
    flushFrame();
    adapter.handlePointerMove(
      makePointerEvent("pointermove", {
        target: timedColumns,
        x: 250,
        y: 220,
      }),
    );
    flushFrame();

    expect(onPreviewSomedaySidebarDrop.mock.calls.at(-1)?.[0]).toBeNull();
  });
});
