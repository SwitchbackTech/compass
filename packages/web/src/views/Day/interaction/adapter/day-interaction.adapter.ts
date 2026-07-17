import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type CalendarId } from "@core/types/domain-primitives";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { GRID_TIME_STEP, TIMED_VISIBLE_HOURS } from "@web/grid/grid.constants";
import { getLocalMinutes } from "@web/grid/interaction/date";
import {
  createDraftEventMount,
  getResizeHandleEdge,
  updateDraftEventTimeLabel,
} from "@web/grid/interaction/dom";
import {
  buildAllDayGridLayoutCache,
  buildTimedGridLayoutCache,
  type GridLayoutCache,
  type GridLayoutCacheSources,
} from "@web/grid/interaction/layout.cache";
import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "@web/grid/interaction/math/all-day.drag";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "@web/grid/interaction/math/all-day.resize";
import { getSmartScrollFrame } from "@web/grid/interaction/math/smart-scroll";
import {
  createTimedDragVisual,
  updateTimedDragVisual,
} from "@web/grid/interaction/math/timed.drag";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "@web/grid/interaction/math/timed.resize";
import { type AllDayDragVisual } from "@web/grid/interaction/types/all-day-drag.types";
import { type AllDayResizeVisual } from "@web/grid/interaction/types/all-day-resize.types";
import {
  type TimedDragVisual,
  type VisualPoint,
} from "@web/grid/interaction/types/timed-drag.types";
import { type TimedResizeVisual } from "@web/grid/interaction/types/timed-resize.types";
import { type InteractionAdapter } from "@web/interaction/interaction.adapter.types";
import {
  createInteractionEngine,
  type InteractionCancellationTargets,
  type InteractionEngine,
} from "@web/interaction/interaction.engine";
import { isEligibleInteractionPointerDown } from "@web/interaction/interaction.pointer";
import {
  type DayInteractionEventType,
  dayEventRegistry,
} from "../registry/day-event.registry";
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
} from "./day-interaction.adapter.types";

export type {
  DayAllDayDragCommitResult,
  DayAllDayResizeCommitResult,
  DayInteractionAdapter,
  DayInteractionRuntime,
  DayTimedDragCommitResult,
  DayTimedResizeCommitResult,
} from "./day-interaction.adapter.types";

const DAY_SMART_SCROLL_EDGE_THRESHOLD_PX = 50;
const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;

const inertRuntime: DayInteractionRuntime = {
  getTimedEventById: () => null,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

export const createDayInteractionAdapter = ({
  engineOptions,
  getColumnKeys = () => [],
  getLayoutSources = () => ({}),
  getVisibleDate = () => dayjs(),
  runtime = () => inertRuntime,
}: DayInteractionAdapterOptions = {}): DayInteractionAdapter => {
  let layout: GridLayoutCache | null = null;
  let scrollTop: number | null = null;

  const engine: InteractionEngine<
    DayInteractionTarget,
    DayInteractionVisual,
    DayInteractionCommitResult
  > = createInteractionEngine({
    adapter: createEngineAdapter(),
    ...engineOptions,
  });

  function ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return engine.ownsPointer(event);
  }

  function connectCancellationEvents(targets?: InteractionCancellationTargets) {
    return engine.connectCancellationEvents(targets);
  }

  function handlePointerDown(
    event: PointerEvent,
  ): DayInteractionPointerOwnership {
    if (!isEligibleInteractionPointerDown(event)) {
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

  function createEngineAdapter(): InteractionAdapter<
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
          result = commitAllDayDragInteraction(target, visual);
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
        const visibleDateKey = getVisibleDate().format(YEAR_MONTH_DAY_FORMAT);
        // The Day view renders one column per calendar, all sharing one date,
        // so drag column keys are CALENDAR IDS (not dates like the Week
        // view) — a column change is a cross-calendar move. Resizes stay
        // within the event's own column and keep the single-column layout.
        // An event whose calendar isn't among the rendered columns (columns
        // and events momentarily out of sync) also falls back to the single
        // column: anchoring it to column 0 would make a purely vertical drag
        // commit a calendar move the user never made.
        const calendarColumnKeys = isDragTarget(target) ? getColumnKeys() : [];
        const eventColumnIndex = calendarColumnKeys.indexOf(
          target.event.calendarId ?? "",
        );
        const columnKeys =
          eventColumnIndex >= 0 ? calendarColumnKeys : [visibleDateKey];
        const initialColumnIndex = Math.max(0, eventColumnIndex);
        const initialColumnKey = columnKeys[initialColumnIndex]!;
        const nextLayout = buildDayLayoutCacheForTarget(
          target,
          getLayoutSources(),
          columnKeys,
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
            dayDate: initialColumnKey,
            dayIndex: initialColumnIndex,
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
          dayDate: initialColumnKey,
          dayIndex: initialColumnIndex,
          endMinutes: getLocalMinutes(target.event.endDate),
          eventId: target.event._id!,
          pointerStart,
          sourceRect,
          startMinutes: getLocalMinutes(target.event.startDate),
        });
      },
      getDraftEventMount: ({ sourceElement, target }) =>
        createDraftEventMount({
          cursor: getInteractionCursor(target),
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getSourceElementDraftEventMode: (target) =>
        isDragTarget(target) ? "dim-source" : "hide-source",
      getTarget: (event) => getInteractionTarget(event),
      updateVisual: ({ pointer, target, visual }) => {
        if (!layout) {
          return {
            draftEvent: null,
            visual,
          };
        }

        if (visual.type === "allDayDrag") {
          const nextVisual = updateAllDayDragVisual(visual, {
            layout,
            pointer,
          });

          return {
            draftEvent: {
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
            draftEvent: {
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

          const smartScroll = applySmartScroll(pointer);
          const nextVisual = updateTimedResizeVisual(visual, {
            layout,
            pointer,
            scrollDeltaPx: smartScroll.scrollDeltaPx,
          });
          const nextEvent = timedResizeVisualToDayGridEvent(
            target.event,
            nextVisual,
            getVisibleDate(),
          );

          return {
            draftEvent: {
              height: nextVisual.height,
              mutate: (node) => updateDraftEventTimeLabel(node, nextEvent),
              transform: nextVisual.transform,
            },
            shouldContinue: smartScroll.isScrolling,
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
          draftEvent: {
            mutate: (node) => updateDraftEventTimeLabel(node, nextEvent),
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

    scrollTop = layout.smartScroll.element.scrollTop;

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
    if (getResizeHandleEdge(event)) {
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
    const edge = getResizeHandleEdge(event);

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
    if (getResizeHandleEdge(event)) {
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
    const edge = getResizeHandleEdge(event);

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

    if (!allDayEvent?._id || !allDayEvent.isAllDay) {
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

    if (!timedEvent?._id || timedEvent.isAllDay) {
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
    const registered = dayEventRegistry.resolveFromTarget(event.target);

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

const buildDayTimedLayoutCache = (
  sources: GridLayoutCacheSources,
  visibleDates: string[],
) =>
  buildTimedGridLayoutCache({
    ...sources,
    edgeThresholdPx: DAY_SMART_SCROLL_EDGE_THRESHOLD_PX,
    mainGridElementId: ID_GRID_MAIN,
    smartScroll: {
      bottomInsetPx: SMART_SCROLL_BOTTOM_INSET_PX,
      speedPx: SMART_SCROLL_SPEED_PX,
    },
    snapMinutes: GRID_TIME_STEP,
    timedColumnsElementId: ID_GRID_COLUMNS_TIMED,
    timedVisibleHours: TIMED_VISIBLE_HOURS,
    visibleDates,
  });

const buildDayAllDayLayoutCache = (
  sources: GridLayoutCacheSources,
  visibleDates: string[],
) =>
  buildAllDayGridLayoutCache({
    ...sources,
    allDayColumnsElementId: ID_ALLDAY_COLUMNS,
    edgeThresholdPx: 0,
    snapMinutes: GRID_TIME_STEP,
    timedVisibleHours: TIMED_VISIBLE_HOURS,
    visibleDates,
  });

const buildDayLayoutCacheForTarget = (
  target: DayInteractionTarget,
  sources: GridLayoutCacheSources,
  visibleDates: string[],
) =>
  isAllDayTarget(target)
    ? buildDayAllDayLayoutCache(sources, visibleDates)
    : buildDayTimedLayoutCache(sources, visibleDates);

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
): DayAllDayDragCommitResult => {
  const hasMoved =
    "dayDate" in visual ? visual.dayDate !== visual.initialDayDate : false;

  // In the Day view every column shares the visible date, so an all-day drag
  // that "moved" can only have changed COLUMN, i.e. calendar. Keep the
  // event's own dates: rewriting them to the visible date would truncate a
  // multi-day all-day event to a single day.
  return {
    event: hasMoved
      ? {
          ...target.event,
          calendarId: columnMoveCalendarId(visual, target.event),
        }
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
  event: GridEvent,
  visual: TimedDragVisual,
  visibleDate: Dayjs,
): GridEvent => ({
  ...event,
  calendarId: columnMoveCalendarId(visual, event),
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

/**
 * Day-view drag column keys are calendar ids (see createVisual), so a drop
 * on a different column is a cross-calendar move. Same-column drops (and the
 * single-column fallback, whose one key is a date string that never changes)
 * keep the event's own calendarId.
 */
const columnMoveCalendarId = (
  visual: Pick<TimedDragVisual, "dayDate" | "initialDayDate">,
  event: GridEvent,
): CalendarId | undefined =>
  visual.dayDate !== visual.initialDayDate
    ? (visual.dayDate as CalendarId)
    : event.calendarId;

const timedResizeVisualToDayGridEvent = (
  event: GridEvent,
  visual: TimedResizeVisual,
  visibleDate: Dayjs,
): GridEvent => ({
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
  event: GridEvent,
  visibleDate: Dayjs,
): GridEvent => ({
  ...event,
  isAllDay: true,
  endDate: visibleDate.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
  startDate: visibleDate.format(YEAR_MONTH_DAY_FORMAT),
});

const hasTimedDragVisualMoved = (visual: TimedDragVisual) =>
  visual.dayDate !== visual.initialDayDate ||
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
