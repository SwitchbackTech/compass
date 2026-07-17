import { Origin } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { dayEventRegistry } from "../registry/day-event.registry";
import {
  createDayInteractionAdapter,
  type DayAllDayDragCommitResult,
  type DayTimedDragCommitResult,
  type DayTimedResizeCommitResult,
} from "./day-interaction.adapter";
import { afterEach, describe, expect, it } from "bun:test";

const visibleDate = dayjs("2026-05-20T00:00:00.000");

const timedSourceRect = {
  height: 40,
  left: 0,
  top: 160,
  width: 320,
};

const allDaySourceRect = {
  height: 24,
  left: 0,
  top: 0,
  width: 320,
};

const CALENDAR_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const CALENDAR_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

const timedEvent: GridEvent = {
  _id: "timed-event",
  calendarId: CALENDAR_A as never,
  endDate: "2026-05-18T10:00:00.000",
  isAllDay: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  startDate: "2026-05-18T09:00:00.000",
  title: "Timed event",
  user: "user-1",
};

const allDayEvent: GridEvent = {
  _id: "all-day-event",
  calendarId: CALENDAR_A as never,
  endDate: "2026-05-21",
  isAllDay: true,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  row: 1,
  startDate: "2026-05-20",
  title: "All-day event",
  user: "user-1",
};

const multiDayAllDayEvent: GridEvent = {
  ...allDayEvent,
  _id: "multi-day-all-day-event",
  endDate: "2026-05-22",
  startDate: "2026-05-19",
  title: "Multi-day all-day event",
};

const elementWithRect = (
  left: number,
  top: number,
  width: number,
  height: number,
) => {
  const element = document.createElement("div");
  const rect = {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect;

  element.getBoundingClientRect = () => rect;

  return element;
};

const makePointerEvent = (
  type: string,
  {
    isPrimary = true,
    pointerId = 1,
    target,
    x,
    y,
  }: {
    isPrimary?: boolean;
    pointerId?: number;
    target: EventTarget;
    x: number;
    y: number;
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

const createAdapter = ({
  columnKeys,
  extraTimedEvents = [],
  mainGridScrollTop = 0,
  onAllDayDrag,
  onTimedDrag,
  onTimedResize,
}: {
  columnKeys?: string[];
  extraTimedEvents?: GridEvent[];
  mainGridScrollTop?: number;
  onAllDayDrag?: (result: DayAllDayDragCommitResult) => void;
  onTimedDrag?: (result: DayTimedDragCommitResult) => void;
  onTimedResize?: (result: DayTimedResizeCommitResult) => void;
} = {}) => {
  const frames = new Map<unknown, FrameRequestCallback>();
  const timers = new Map<unknown, () => void>();
  let nextFrameId = 1;
  let nextTimerId = 1;
  const allDayColumnsElement = elementWithRect(0, 0, 320, 40);
  const mainGridElement = elementWithRect(0, 40, 320, 780);
  const timedColumnsElement = elementWithRect(0, 40, 320, 780);

  Object.defineProperty(mainGridElement, "clientHeight", { value: 780 });
  Object.defineProperty(mainGridElement, "scrollHeight", { value: 1560 });
  mainGridElement.scrollTop = mainGridScrollTop;

  const adapter = createDayInteractionAdapter({
    engineOptions: {
      cancelFrame: (frame) => frames.delete(frame),
      clearTimer: (timer) => timers.delete(timer),
      now: () => 0,
      requestFrame: (callback) => {
        const frameId = nextFrameId;

        nextFrameId += 1;
        frames.set(frameId, callback);

        return frameId;
      },
      setTimer: (callback) => {
        const timerId = nextTimerId;

        nextTimerId += 1;
        timers.set(timerId, callback);

        return timerId;
      },
    },
    getColumnKeys: () => columnKeys ?? [],
    getLayoutSources: () => ({
      allDayColumnsElement,
      mainGridElement,
      timedColumnsElement,
    }),
    getVisibleDate: () => visibleDate,
    runtime: () => ({
      getAllDayEventById: (eventId) =>
        eventId === allDayEvent._id
          ? allDayEvent
          : eventId === multiDayAllDayEvent._id
            ? multiDayAllDayEvent
            : null,
      getTimedEventById: (eventId) =>
        extraTimedEvents.find((event) => event._id === eventId) ??
        (eventId === timedEvent._id ? timedEvent : null),
      onClickAllDayEvent: () => undefined,
      onClickTimedEvent: () => undefined,
      onCommitAllDayDrag: (result) => onAllDayDrag?.(result),
      onCommitAllDayResize: () => undefined,
      onCommitTimedDrag: (result) => onTimedDrag?.(result),
      onCommitTimedResize: (result) => onTimedResize?.(result),
    }),
  });

  const flushFrame = (timestamp = 16) => {
    const [[frameId, callback]] = frames;

    if (!callback) {
      throw new Error("Expected a frame callback to be scheduled");
    }

    frames.delete(frameId);
    callback(timestamp);
  };

  const flushTimer = () => {
    const [[timerId, callback]] = timers;

    if (!callback) {
      throw new Error("Expected a timer callback to be scheduled");
    }

    timers.delete(timerId);
    callback();
  };

  return { adapter, flushFrame, flushTimer, mainGridElement };
};

const registerEvent = (event: GridEvent, eventType: "all-day" | "timed") => {
  const rect = event.isAllDay ? allDaySourceRect : timedSourceRect;
  const source = elementWithRect(rect.left, rect.top, rect.width, rect.height);
  const child = document.createElement("span");

  source.append(child);
  document.body.append(source);
  dayEventRegistry.register({
    element: source,
    eventId: event._id!,
    eventType,
  });

  return { child, source };
};

const dragTimedEvent = () => {
  const result: { current?: DayTimedDragCommitResult } = {};
  const { child } = registerEvent(timedEvent, "timed");
  const { adapter, flushFrame } = createAdapter({
    onTimedDrag: (nextResult) => {
      result.current = nextResult;
    },
  });

  adapter.handlePointerDown(
    makePointerEvent("pointerdown", { target: child, x: 160, y: 160 }),
  );
  adapter.handlePointerMove(
    makePointerEvent("pointermove", { target: child, x: 160, y: 220 }),
  );
  flushFrame();
  adapter.handlePointerUp(
    makePointerEvent("pointerup", { target: child, x: 160, y: 220 }),
  );

  if (!result.current) {
    throw new Error("Expected timed drag to commit");
  }

  return result.current;
};

const resizeTimedEvent = (edge: "startDate" | "endDate") => {
  const result: { current?: DayTimedResizeCommitResult } = {};
  const { source } = registerEvent(timedEvent, "timed");
  const handle = document.createElement("span");

  handle.setAttribute("data-calendar-event-resize-handle", edge);
  source.append(handle);

  const { adapter, flushFrame } = createAdapter({
    onTimedResize: (nextResult) => {
      result.current = nextResult;
    },
  });

  adapter.handlePointerDown(
    makePointerEvent("pointerdown", { target: handle, x: 160, y: 160 }),
  );
  adapter.handlePointerMove(
    makePointerEvent("pointermove", { target: handle, x: 160, y: 220 }),
  );
  flushFrame();
  adapter.handlePointerUp(
    makePointerEvent("pointerup", { target: handle, x: 160, y: 220 }),
  );

  if (!result.current) {
    throw new Error("Expected timed resize to commit");
  }

  return result.current;
};

const dragAllDayEvent = () => {
  const result: { current?: DayAllDayDragCommitResult } = {};
  const { child } = registerEvent(allDayEvent, "all-day");
  const { adapter, flushFrame } = createAdapter({
    onAllDayDrag: (nextResult) => {
      result.current = nextResult;
    },
  });

  adapter.handlePointerDown(
    makePointerEvent("pointerdown", { target: child, x: 40, y: 20 }),
  );
  adapter.handlePointerMove(
    makePointerEvent("pointermove", { target: child, x: 160, y: 20 }),
  );
  flushFrame();
  adapter.handlePointerUp(
    makePointerEvent("pointerup", { target: child, x: 160, y: 20 }),
  );

  if (!result.current) {
    throw new Error("Expected all-day drag to commit");
  }

  return result.current;
};

const activateAllDayEventWithoutMoving = () => {
  const result: { current?: DayAllDayDragCommitResult } = {};
  const { child } = registerEvent(multiDayAllDayEvent, "all-day");
  const { adapter, flushTimer } = createAdapter({
    onAllDayDrag: (nextResult) => {
      result.current = nextResult;
    },
  });

  adapter.handlePointerDown(
    makePointerEvent("pointerdown", { target: child, x: 40, y: 20 }),
  );
  flushTimer();
  adapter.handlePointerUp(
    makePointerEvent("pointerup", { target: child, x: 40, y: 20 }),
  );

  if (!result.current) {
    throw new Error("Expected all-day no-op drag to commit");
  }

  return result.current;
};

const createTimedResizeHandle = (edge: "startDate" | "endDate") => {
  const { source } = registerEvent(timedEvent, "timed");
  const handle = document.createElement("span");

  handle.setAttribute("data-calendar-event-resize-handle", edge);
  source.append(handle);

  return handle;
};

afterEach(() => {
  document.body.innerHTML = "";
  dayEventRegistry.clear();
});

// Two 160px-wide calendar columns across the 320px grid: dragging from
// column A's center (x=80) to column B's center (x=240) crosses columns.
const dragEventAcrossCalendarColumns = (
  event: GridEvent,
  eventType: "all-day" | "timed",
  { toX, toY }: { toX: number; toY?: number },
) => {
  const results: {
    allDay?: DayAllDayDragCommitResult;
    timed?: DayTimedDragCommitResult;
  } = {};
  const { child } = registerEvent(event, eventType);
  const { adapter, flushFrame } = createAdapter({
    columnKeys: [CALENDAR_A, CALENDAR_B],
    extraTimedEvents: eventType === "timed" ? [event] : [],
    onAllDayDrag: (result) => {
      results.allDay = result;
    },
    onTimedDrag: (result) => {
      results.timed = result;
    },
  });
  const y = eventType === "timed" ? 160 : 20;

  adapter.handlePointerDown(
    makePointerEvent("pointerdown", { target: child, x: 80, y }),
  );
  adapter.handlePointerMove(
    makePointerEvent("pointermove", { target: child, x: toX, y: toY ?? y }),
  );
  flushFrame();
  adapter.handlePointerUp(
    makePointerEvent("pointerup", { target: child, x: toX, y: toY ?? y }),
  );

  const result = eventType === "timed" ? results.timed : results.allDay;

  if (!result) {
    throw new Error("Expected the drag to commit");
  }

  return result;
};

describe("DayInteractionAdapter", () => {
  it("keeps timed drag on the one visible date", () => {
    const result = dragTimedEvent();

    expect(result.type).toBe("timedDragEnd");
    expect(result.event.isAllDay).toBe(false);
    expect(dayjs(result.event.startDate).isSame(visibleDate, "day")).toBe(true);
  });

  it("moves a timed event to the other calendar when dropped on its column", () => {
    const result = dragEventAcrossCalendarColumns(timedEvent, "timed", {
      toX: 240,
    });

    expect(result.hasMoved).toBe(true);
    expect(result.event.calendarId).toBe(CALENDAR_B as never);
    expect(dayjs(result.event.startDate).isSame(visibleDate, "day")).toBe(true);
  });

  it("keeps a timed event's calendar when dragged within its own column", () => {
    const result = dragEventAcrossCalendarColumns(timedEvent, "timed", {
      toX: 80,
      toY: 220,
    });

    expect(result.hasMoved).toBe(true);
    expect(result.event.calendarId).toBe(CALENDAR_A as never);
  });

  it("moves an all-day event to the other calendar when dropped on its column", () => {
    const result = dragEventAcrossCalendarColumns(allDayEvent, "all-day", {
      toX: 240,
    });

    expect(result.hasMoved).toBe(true);
    expect(result.event.calendarId).toBe(CALENDAR_B as never);
    expect(result.event.startDate).toBe(allDayEvent.startDate);
    expect(result.event.endDate).toBe(allDayEvent.endDate);
  });

  it("keeps a multi-day all-day event's dates on a cross-calendar move", () => {
    const result = dragEventAcrossCalendarColumns(
      multiDayAllDayEvent,
      "all-day",
      { toX: 240 },
    );

    expect(result.hasMoved).toBe(true);
    expect(result.event.calendarId).toBe(CALENDAR_B as never);
    expect(result.event.startDate).toBe(multiDayAllDayEvent.startDate);
    expect(result.event.endDate).toBe(multiDayAllDayEvent.endDate);
  });

  it("disables cross-column movement for an event whose calendar has no column", () => {
    const orphan: GridEvent = {
      ...timedEvent,
      _id: "orphan-timed-event",
      calendarId: "cccccccccccccccccccccccc" as never,
    };
    const result = dragEventAcrossCalendarColumns(orphan, "timed", {
      toX: 240,
    });

    // Horizontal-only drag in the single-column fallback: no column change,
    // no time change, so the commit reports no movement at all.
    expect(result.hasMoved).toBe(false);
    expect(result.event.calendarId).toBe(orphan.calendarId!);
  });

  it("keeps timed resize timed with a valid time range", () => {
    const result = resizeTimedEvent("endDate");

    expect(result.type).toBe("timedResizeEnd");
    expect(result.event.isAllDay).toBe(false);
    expect(dayjs(result.event.endDate).isAfter(result.event.startDate)).toBe(
      true,
    );
    expect(dayjs(result.event.startDate).isSame(visibleDate, "day")).toBe(true);
  });

  it("creates a draft event time label when dragging a short timed event without one", () => {
    const { child, source } = registerEvent(timedEvent, "timed");
    const { adapter, flushFrame } = createAdapter();

    expect(
      source.querySelector("[data-calendar-event-time-label='true']"),
    ).toBeNull();

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 160, y: 160 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 160, y: 220 }),
    );
    flushFrame();

    const draftEvent = document.querySelector(
      "[data-calendar-draft-event='true']",
    );
    const timeLabel = draftEvent?.querySelector(
      "[data-calendar-event-time-label='true']",
    );

    expect(timeLabel).toBeInstanceOf(HTMLElement);
    expect(timeLabel?.textContent).not.toBe("");
  });

  it("uses the latest timed grid scroll position when it changes before timed drag commit", () => {
    const result: { current?: DayTimedDragCommitResult } = {};
    const { child } = registerEvent(timedEvent, "timed");
    const { adapter, flushFrame, mainGridElement } = createAdapter({
      onTimedDrag: (nextResult) => {
        result.current = nextResult;
      },
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 160, y: 160 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 160, y: 220 }),
    );
    flushFrame();

    mainGridElement.scrollTop = 120;

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 160, y: 220 }),
    );

    expect(result.current).toMatchObject({
      event: expect.objectContaining({
        endDate: expect.stringContaining("13:00"),
        startDate: expect.stringContaining("12:00"),
      }),
      hasMoved: true,
      type: "timedDragEnd",
    });
  });

  it("continues timed smart scroll while dragging a saved timed event", () => {
    const result: { current?: DayTimedDragCommitResult } = {};
    const { child } = registerEvent(timedEvent, "timed");
    const { adapter, flushFrame, mainGridElement } = createAdapter({
      onTimedDrag: (nextResult) => {
        result.current = nextResult;
      },
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: child, x: 160, y: 160 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 160, y: 220 }),
    );
    flushFrame(16);
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: child, x: 160, y: 810 }),
    );
    flushFrame(32);
    flushFrame(48);

    expect(mainGridElement.scrollTop).toBe(20);

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: child, x: 160, y: 810 }),
    );

    expect(result.current?.type).toBe("timedDragEnd");
  });

  it("keeps all-day drag all-day on the one visible date", () => {
    const result = dragAllDayEvent();

    expect(result.type).toBe("allDayDragEnd");
    expect(result.event.isAllDay).toBe(true);
    expect(result.event.startDate).toBe(
      visibleDate.format(YEAR_MONTH_DAY_FORMAT),
    );
    expect(result.event.endDate).toBe(
      visibleDate.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
    );
  });

  it("keeps an activated no-op all-day drag on the original event dates", () => {
    const result = activateAllDayEventWithoutMoving();

    expect(result.type).toBe("allDayDragEnd");
    expect(result.hasMoved).toBe(false);
    expect(result.event.startDate).toBe(multiDayAllDayEvent.startDate);
    expect(result.event.endDate).toBe(multiDayAllDayEvent.endDate);
  });

  it("continues timed smart scroll in the RAF loop while resizing toward the grid edge", () => {
    const result: { current?: DayTimedResizeCommitResult } = {};
    const handle = createTimedResizeHandle("endDate");
    const { adapter, flushFrame, mainGridElement } = createAdapter({
      onTimedResize: (nextResult) => {
        result.current = nextResult;
      },
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: handle, x: 160, y: 160 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: handle, x: 160, y: 220 }),
    );

    flushFrame(16);
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: handle, x: 160, y: 700 }),
    );
    flushFrame(32);
    flushFrame(48);

    expect(mainGridElement.scrollTop).toBe(20);

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: handle, x: 160, y: 700 }),
    );

    expect(result.current).toMatchObject({
      event: expect.objectContaining({
        endDate: expect.stringContaining("19:30"),
        startDate: expect.stringContaining("09:00"),
      }),
    });
  });

  it("uses the latest timed grid scroll position when it changes before timed resize commit", () => {
    const result: { current?: DayTimedResizeCommitResult } = {};
    const handle = createTimedResizeHandle("endDate");
    const { adapter, flushFrame, mainGridElement } = createAdapter({
      onTimedResize: (nextResult) => {
        result.current = nextResult;
      },
    });

    adapter.handlePointerDown(
      makePointerEvent("pointerdown", { target: handle, x: 160, y: 160 }),
    );
    adapter.handlePointerMove(
      makePointerEvent("pointermove", { target: handle, x: 160, y: 220 }),
    );

    flushFrame();

    mainGridElement.scrollTop = 120;

    adapter.handlePointerUp(
      makePointerEvent("pointerup", { target: handle, x: 160, y: 220 }),
    );

    expect(result.current).toMatchObject({
      event: expect.objectContaining({
        endDate: expect.stringContaining("13:00"),
        startDate: expect.stringContaining("09:00"),
      }),
    });
  });
});
