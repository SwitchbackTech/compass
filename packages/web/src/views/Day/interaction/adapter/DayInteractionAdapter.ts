import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  CALENDAR_GRID_TIME_STEP,
  CALENDAR_TIMED_VISIBLE_HOURS,
} from "@web/common/calendar-grid/calendarGrid.constants";
import { getLocalMinutes } from "@web/common/calendar-grid/interaction/calendarInteractionDate";
import {
  createCalendarInteractionEventOverlayMount,
  getCalendarResizeHandleEdge,
  updateCalendarOverlayTimeLabel,
} from "@web/common/calendar-grid/interaction/calendarInteractionDom";
import {
  buildAllDayCalendarLayoutCache,
  buildTimedCalendarLayoutCache,
  type CalendarLayoutCache,
  type CalendarLayoutCacheSources,
} from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "@web/common/calendar-grid/interaction/math/allDayDrag";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "@web/common/calendar-grid/interaction/math/allDayResize";
import { getSmartScrollFrame } from "@web/common/calendar-grid/interaction/math/smartScroll";
import {
  createTimedDragVisual,
  updateTimedDragVisual,
} from "@web/common/calendar-grid/interaction/math/timedDrag";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "@web/common/calendar-grid/interaction/math/timedResize";
import { type AllDayDragVisual } from "@web/common/calendar-grid/interaction/model/AllDayDragVisual";
import { type AllDayResizeVisual } from "@web/common/calendar-grid/interaction/model/AllDayResizeVisual";
import {
  type TimedDragVisual,
  type VisualPoint,
} from "@web/common/calendar-grid/interaction/model/TimedDragVisual";
import { type TimedResizeVisual } from "@web/common/calendar-grid/interaction/model/TimedResizeVisual";
import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngine,
  createCalendarInteractionEngine,
} from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { isEligibleCalendarInteractionPointerDown } from "@web/common/calendar-interaction/calendarInteractionPointer";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  type DayInteractionEventType,
  dayCalendarEventRegistry,
} from "../registry/dayCalendarEventRegistry";
import {
  type DayAllDayDragCommitResult,
  type DayAllDayDragTarget,
  type DayAllDayResizeCommitResult,
  type DayAllDayResizeTarget,
  type DayInteractionAdapter,
  type DayInteractionAdapterOptions,
  type DayInteractionCommitResult,
  type DayInteractionPointerOwnership,
  type DayInteractionRuntime,
  type DayInteractionTarget,
  type DayInteractionVisual,
  type DayResolvedEventTarget,
  type DayTimedDragCommitResult,
  type DayTimedDragTarget,
  type DayTimedResizeCommitResult,
  type DayTimedResizeTarget,
} from "./DayInteractionAdapter.types";

export type {
  DayAllDayDragCommitResult,
  DayAllDayResizeCommitResult,
  DayInteractionAdapter,
  DayInteractionRuntime,
  DayTimedDragCommitResult,
  DayTimedResizeCommitResult,
} from "./DayInteractionAdapter.types";

const DAY_VISIBLE_DATE_COUNT = 1;
const DAY_SMART_SCROLL_EDGE_THRESHOLD_PX = 50;
const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;

const inertRuntime: DayInteractionRuntime = {
  getTimedEventById: () => null,
  isEventPending: () => false,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

export const createDayInteractionAdapter = ({
  engineOptions,
  getLayoutSources = () => ({}),
  getVisibleDate = () => dayjs(),
  runtime = () => inertRuntime,
}: DayInteractionAdapterOptions = {}): DayInteractionAdapter => {
  let layout: CalendarLayoutCache | null = null;
  let scrollTop: number | null = null;

  const engine: CalendarInteractionEngine<
    DayInteractionTarget,
    DayInteractionVisual,
    DayInteractionCommitResult
  > = createCalendarInteractionEngine({
    adapter: createEngineAdapter(),
    ...engineOptions,
  });

  function ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return engine.ownsPointer(event);
  }

  function connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ) {
    return engine.connectCancellationEvents(targets);
  }

  function handlePointerDown(
    event: PointerEvent,
  ): DayInteractionPointerOwnership {
    if (!isEligibleCalendarInteractionPointerDown(event)) {
      return {
        reason: "ineligible-day-pointer",
        shouldOwn: false,
      };
    }

    const target = getInteractionTarget(event);

    if (!target) {
      return {
        reason: "no-day-interaction-target",
        shouldOwn: false,
      };
    }

    if (!engine.handlePointerDown(event)) {
      return {
        reason: "calendar-interaction-engine-busy",
        shouldOwn: false,
      };
    }

    return {
      reason: getOwnershipReason(target),
      shouldOwn: true,
    };
  }

  function handlePointerMove(event: PointerEvent) {
    const isOwnedPointer = ownsPointer(event);

    engine.handlePointerMove(event);

    return isOwnedPointer;
  }

  function handlePointerUp(event: PointerEvent) {
    const isOwnedPointer = ownsPointer(event);
    const result = engine.handlePointerUp(event);

    if (!result) {
      return isOwnedPointer;
    }

    const currentRuntime = runtime();

    if (result.type === "click") {
      if (isAllDayTarget(result.target)) {
        currentRuntime.onClickAllDayEvent?.(result.target.event);
      } else {
        currentRuntime.onClickTimedEvent(result.target.event);
      }

      return isOwnedPointer;
    }

    if (result.result.type === "allDayDragEnd") {
      currentRuntime.onCommitAllDayDrag?.(result.result);
      return isOwnedPointer;
    }

    if (result.result.type === "allDayResizeEnd") {
      currentRuntime.onCommitAllDayResize?.(result.result);
      return isOwnedPointer;
    }

    if (result.result.type === "timedDragEnd") {
      currentRuntime.onCommitTimedDrag(result.result);
      return isOwnedPointer;
    }

    currentRuntime.onCommitTimedResize?.(result.result);

    return isOwnedPointer;
  }

  function handlePointerCancel(event: PointerEvent) {
    const isOwnedPointer = ownsPointer(event);

    engine.handlePointerCancel(event);

    return isOwnedPointer;
  }

  function cancel() {
    engine.cancel();
  }

  function createEngineAdapter(): CalendarInteractionAdapter<
    DayInteractionTarget,
    DayInteractionVisual,
    DayInteractionCommitResult
  > {
    return {
      cancel: () => {
        layout = null;
        scrollTop = null;
      },
      commit: ({ target, visual }) => {
        let result: DayInteractionCommitResult;
        const visibleDate = getVisibleDate();

        if (visual.type === "allDayDrag" && target.type === "allDayDrag") {
          result = commitAllDayDragInteraction(target, visual, visibleDate);
        } else if (
          visual.type === "allDayResize" &&
          target.type === "allDayResize"
        ) {
          result = commitAllDayResizeInteraction(target, visual, visibleDate);
        } else if (
          visual.type === "timedResize" &&
          target.type === "timedResize"
        ) {
          result = commitTimedResizeInteraction(target, visual, visibleDate);
        } else if (visual.type === "timedDrag" && target.type === "timedDrag") {
          result = commitTimedDragInteraction(target, visual, visibleDate);
        } else {
          throw new Error("Mismatched Day interaction target");
        }

        layout = null;
        scrollTop = null;

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const nextLayout = buildDayLayoutCacheForTarget(
          target,
          getLayoutSources(),
        );

        if (!nextLayout) {
          return null;
        }

        const sourceRect = readElementRect(sourceElement);

        layout = nextLayout;
        scrollTop = nextLayout.smartScroll?.initialScrollTop ?? null;
        runtime().onMotionActivation?.(target);

        if (target.type === "allDayDrag") {
          return createAllDayDragVisual({
            dayIndex: 0,
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
          });
        }

        if (target.type === "allDayResize") {
          return createAllDayResizeVisual({
            edge: target.edge,
            endDayIndex: 0,
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
            startDayIndex: 0,
          });
        }

        if (target.type === "timedResize") {
          return createTimedResizeVisual({
            edge: target.edge,
            endMinutes: getLocalMinutes(target.event.endDate),
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
            startMinutes: getLocalMinutes(target.event.startDate),
          });
        }

        return createTimedDragVisual({
          dayIndex: 0,
          endMinutes: getLocalMinutes(target.event.endDate),
          eventId: target.event._id!,
          pointerStart,
          sourceRect,
          startMinutes: getLocalMinutes(target.event.startDate),
        });
      },
      getOverlayMount: ({ sourceElement, target }) =>
        createCalendarInteractionEventOverlayMount({
          cursor: getInteractionCursor(target),
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getSourceElementOverlayMode: (target) =>
        isDragTarget(target) ? "dim-source" : "hide-source",
      getTarget: (event) => getInteractionTarget(event),
      updateVisual: ({ pointer, target, visual }) => {
        if (!layout) {
          return {
            overlay: null,
            visual,
          };
        }

        if (visual.type === "allDayDrag") {
          const nextVisual = updateAllDayDragVisual(visual, {
            layout,
            pointer,
          });

          return {
            overlay: {
              transform: nextVisual.transform,
            },
            visual: nextVisual,
          };
        }

        if (visual.type === "allDayResize") {
          const nextVisual = updateAllDayResizeVisual(visual, {
            layout,
            pointer,
          });

          return {
            overlay: {
              height: nextVisual.sourceRect.height,
              transform: nextVisual.transform,
              width: nextVisual.width,
            },
            visual: nextVisual,
          };
        }

        if (visual.type === "timedResize") {
          if (target.type !== "timedResize") {
            throw new Error("Mismatched Day interaction target");
          }

          const nextVisual = updateTimedResizeVisual(visual, {
            layout,
            pointer,
          });
          const nextEvent = timedResizeVisualToDayGridEvent(
            target.event,
            nextVisual,
            getVisibleDate(),
          );

          return {
            overlay: {
              height: nextVisual.height,
              mutate: (node) => updateCalendarOverlayTimeLabel(node, nextEvent),
              transform: nextVisual.transform,
            },
            visual: nextVisual,
          };
        }

        if (target.type !== "timedDrag") {
          throw new Error("Mismatched Day interaction target");
        }

        const smartScroll = applySmartScroll(pointer);
        const nextVisual = updateTimedDragVisual(visual, {
          layout,
          pointer,
          scrollDeltaPx: smartScroll.scrollDeltaPx,
        });
        const nextEvent = timedDragVisualToDayGridEvent(
          target.event,
          nextVisual,
          getVisibleDate(),
        );

        return {
          overlay: {
            mutate: (node) => updateCalendarOverlayTimeLabel(node, nextEvent),
            transform: nextVisual.transform,
          },
          shouldContinue: smartScroll.isScrolling,
          visual: nextVisual,
        };
      },
    };
  }

  function applySmartScroll(pointer: VisualPoint) {
    if (!layout?.smartScroll || scrollTop === null) {
      return { isScrolling: false, scrollDeltaPx: 0 };
    }

    const frame = getSmartScrollFrame({
      cache: layout.smartScroll,
      pointerY: pointer.y,
      scrollTop,
    });

    if (frame.scrollTop !== scrollTop) {
      layout.smartScroll.element.scrollTop = frame.scrollTop;
      scrollTop = frame.scrollTop;
    }

    return {
      isScrolling: frame.velocityPx !== 0,
      scrollDeltaPx: scrollTop - layout.smartScroll.initialScrollTop,
    };
  }

  function getInteractionTarget(
    event: PointerEvent,
  ): DayInteractionTarget | null {
    const allDayResizeTarget = getAllDayResizeTarget(event);

    if (allDayResizeTarget) {
      return allDayResizeTarget;
    }

    const timedResizeTarget = getTimedResizeTarget(event);

    if (timedResizeTarget) {
      return timedResizeTarget;
    }

    const timedDragTarget = getTimedDragTarget(event);

    if (timedDragTarget) {
      return timedDragTarget;
    }

    return getAllDayDragTarget(event);
  }

  function getAllDayDragTarget(
    event: PointerEvent,
  ): DayAllDayDragTarget | null {
    if (getCalendarResizeHandleEdge(event)) {
      return null;
    }

    const target = resolveAllDayEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      ...target,
      type: "allDayDrag",
    };
  }

  function getAllDayResizeTarget(
    event: PointerEvent,
  ): DayAllDayResizeTarget | null {
    const edge = getCalendarResizeHandleEdge(event);

    if (!edge) {
      return null;
    }

    const target = resolveAllDayEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      edge,
      ...target,
      type: "allDayResize",
    };
  }

  function getTimedDragTarget(event: PointerEvent): DayTimedDragTarget | null {
    if (getCalendarResizeHandleEdge(event)) {
      return null;
    }

    const target = resolveTimedEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      ...target,
      type: "timedDrag",
    };
  }

  function getTimedResizeTarget(
    event: PointerEvent,
  ): DayTimedResizeTarget | null {
    const edge = getCalendarResizeHandleEdge(event);

    if (!edge) {
      return null;
    }

    const target = resolveTimedEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      edge,
      ...target,
      type: "timedResize",
    };
  }

  function resolveAllDayEventTarget(
    event: PointerEvent,
  ): DayResolvedEventTarget | null {
    const registered = getRegisteredTarget(event, "all-day");

    if (!registered) {
      return null;
    }

    const currentRuntime = runtime();
    const allDayEvent = currentRuntime.getAllDayEventById?.(registered.eventId);

    if (
      !allDayEvent?._id ||
      !allDayEvent.isAllDay ||
      currentRuntime.isEventPending(allDayEvent._id)
    ) {
      return null;
    }

    return {
      event: allDayEvent,
      hadFormOpenBeforeInteraction: currentRuntime.isFormOpen?.() ?? false,
      registered,
    };
  }

  function resolveTimedEventTarget(
    event: PointerEvent,
  ): DayResolvedEventTarget | null {
    const registered = getRegisteredTarget(event, "timed");

    if (!registered) {
      return null;
    }

    const currentRuntime = runtime();
    const timedEvent = currentRuntime.getTimedEventById(registered.eventId);

    if (
      !timedEvent?._id ||
      timedEvent.isAllDay ||
      currentRuntime.isEventPending(timedEvent._id)
    ) {
      return null;
    }

    return {
      event: timedEvent,
      hadFormOpenBeforeInteraction: currentRuntime.isFormOpen?.() ?? false,
      registered,
    };
  }

  function getRegisteredTarget(
    event: PointerEvent,
    eventType: DayInteractionEventType,
  ) {
    const registered = dayCalendarEventRegistry.resolveFromTarget(event.target);

    return registered?.eventType === eventType ? registered : null;
  }

  return {
    cancel,
    connectCancellationEvents,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    ownsPointer,
  };
};

const buildDayTimedLayoutCache = (sources: CalendarLayoutCacheSources = {}) =>
  buildTimedCalendarLayoutCache({
    ...sources,
    edgeThresholdPx: DAY_SMART_SCROLL_EDGE_THRESHOLD_PX,
    mainGridElementId: ID_GRID_MAIN,
    smartScroll: {
      bottomInsetPx: SMART_SCROLL_BOTTOM_INSET_PX,
      speedPx: SMART_SCROLL_SPEED_PX,
    },
    snapMinutes: CALENDAR_GRID_TIME_STEP,
    timedColumnsElementId: ID_GRID_COLUMNS_TIMED,
    timedVisibleHours: CALENDAR_TIMED_VISIBLE_HOURS,
    visibleDateCount: DAY_VISIBLE_DATE_COUNT,
  });

const buildDayAllDayLayoutCache = (sources: CalendarLayoutCacheSources = {}) =>
  buildAllDayCalendarLayoutCache({
    ...sources,
    allDayColumnsElementId: ID_ALLDAY_COLUMNS,
    edgeThresholdPx: 0,
    snapMinutes: CALENDAR_GRID_TIME_STEP,
    timedVisibleHours: CALENDAR_TIMED_VISIBLE_HOURS,
    visibleDateCount: DAY_VISIBLE_DATE_COUNT,
  });

const buildDayLayoutCacheForTarget = (
  target: DayInteractionTarget,
  sources: CalendarLayoutCacheSources,
) =>
  isAllDayTarget(target)
    ? buildDayAllDayLayoutCache(sources)
    : buildDayTimedLayoutCache(sources);

const commitTimedDragInteraction = (
  target: DayTimedDragTarget,
  visual: TimedDragVisual,
  visibleDate: Dayjs,
): DayTimedDragCommitResult => {
  const hasMoved = hasTimedDragVisualMoved(visual);

  return {
    event: hasMoved
      ? timedDragVisualToDayGridEvent(target.event, visual, visibleDate)
      : target.event,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved,
    type: "timedDragEnd",
  };
};

const commitTimedResizeInteraction = (
  target: DayTimedResizeTarget,
  visual: TimedResizeVisual,
  visibleDate: Dayjs,
): DayTimedResizeCommitResult => {
  const hasMoved = hasTimedResizeVisualMoved(visual);

  return {
    event: hasMoved
      ? timedResizeVisualToDayGridEvent(target.event, visual, visibleDate)
      : target.event,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved,
    type: "timedResizeEnd",
  };
};

const commitAllDayDragInteraction = (
  target: DayAllDayDragTarget,
  visual: AllDayDragVisual,
  visibleDate: Dayjs,
): DayAllDayDragCommitResult => {
  const hasMoved =
    "dayIndex" in visual
      ? visual.dayIndex !== visual.initialDayIndex ||
        visual.weekOffsetDays !== 0
      : false;

  return {
    event: hasMoved
      ? allDayVisualToDayGridEvent(target.event, visibleDate)
      : target.event,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved,
    type: "allDayDragEnd",
  };
};

const commitAllDayResizeInteraction = (
  target: DayAllDayResizeTarget,
  visual: AllDayResizeVisual,
  visibleDate: Dayjs,
): DayAllDayResizeCommitResult => {
  const hasMoved =
    visual.startDayIndex !== visual.initialStartDayIndex ||
    visual.endDayIndex !== visual.initialEndDayIndex;

  return {
    event: hasMoved
      ? allDayVisualToDayGridEvent(target.event, visibleDate)
      : target.event,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved,
    type: "allDayResizeEnd",
  };
};

const timedDragVisualToDayGridEvent = (
  event: Schema_GridEvent,
  visual: TimedDragVisual,
  visibleDate: Dayjs,
): Schema_GridEvent => ({
  ...event,
  isAllDay: false,
  endDate: visibleDate
    .startOf("day")
    .add(visual.endMinutes, "minutes")
    .format(),
  startDate: visibleDate
    .startOf("day")
    .add(visual.startMinutes, "minutes")
    .format(),
});

const timedResizeVisualToDayGridEvent = (
  event: Schema_GridEvent,
  visual: TimedResizeVisual,
  visibleDate: Dayjs,
): Schema_GridEvent => ({
  ...event,
  isAllDay: false,
  endDate: visibleDate
    .startOf("day")
    .add(visual.endMinutes, "minutes")
    .format(),
  startDate: visibleDate
    .startOf("day")
    .add(visual.startMinutes, "minutes")
    .format(),
});

const allDayVisualToDayGridEvent = (
  event: Schema_GridEvent,
  visibleDate: Dayjs,
): Schema_GridEvent => ({
  ...event,
  isAllDay: true,
  endDate: visibleDate.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
  startDate: visibleDate.format(YEAR_MONTH_DAY_FORMAT),
});

const hasTimedDragVisualMoved = (visual: TimedDragVisual) =>
  visual.dayIndex !== visual.initialDayIndex ||
  visual.weekOffsetDays !== 0 ||
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

const hasTimedResizeVisualMoved = (visual: TimedResizeVisual) =>
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

const isAllDayTarget = (
  target: DayInteractionTarget,
): target is DayAllDayDragTarget | DayAllDayResizeTarget =>
  target.type === "allDayDrag" || target.type === "allDayResize";

const isDragTarget = (
  target: DayInteractionTarget,
): target is DayAllDayDragTarget | DayTimedDragTarget =>
  target.type === "allDayDrag" || target.type === "timedDrag";

const getOwnershipReason = (target: DayInteractionTarget) => {
  switch (target.type) {
    case "allDayDrag":
      return "saved-all-day-drag";
    case "allDayResize":
      return "saved-all-day-resize";
    case "timedResize":
      return "saved-timed-resize";
    case "timedDrag":
      return "saved-timed-drag";
  }
};

const getInteractionCursor = (target: DayInteractionTarget) => {
  switch (target.type) {
    case "allDayResize":
      return "col-resize";
    case "timedResize":
      return "row-resize";
    case "allDayDrag":
    case "timedDrag":
      return "move";
  }
};

const readElementRect = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};
