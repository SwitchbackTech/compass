import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngine,
  type CalendarInteractionEngineSchedulerOptions,
  createCalendarInteractionEngine,
} from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import {
  allDayDragVisualToGridEvent,
  allDayResizeVisualToGridEvent,
  hasAllDayDragVisualMoved,
  hasAllDayResizeVisualChanged,
} from "./commit/allDayVisualToGridEvent";
import {
  hasTimedDragVisualMoved,
  hasTimedResizeVisualMoved,
  timedDragVisualToGridEvent,
  timedResizeVisualToGridEvent,
} from "./commit/timedDragVisualToGridEvent";
import { createWeekInteractionEventOverlayMount } from "./dom/cloneWeekInteractionEventElement";
import {
  type WeekInteractionEventType,
  type WeekInteractionRegisteredTarget,
  weekEventRegistry,
} from "./geometry/weekEventRegistry";
import {
  buildAllDayWeekLayoutCache,
  buildTimedWeekLayoutCache,
  getNearestDayColumn,
  type WeekEdgeNavigationCache,
  type WeekLayoutCache,
} from "./geometry/weekLayoutCache";
import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "./math/allDayDrag";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "./math/allDayResize";
import { getSmartScrollFrame } from "./math/smartScroll";
import { createTimedDragVisual, updateTimedDragVisual } from "./math/timedDrag";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "./math/timedResize";
import { type AllDayDragVisual } from "./model/AllDayDragVisual";
import {
  type AllDayResizeEdge,
  type AllDayResizeVisual,
} from "./model/AllDayResizeVisual";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "./model/TimedDragVisual";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "./model/TimedResizeVisual";
import {
  resetWeekInteractionEdgeNavigationState,
  setWeekInteractionEdgeNavigationState,
} from "./weekInteractionEdgeNavigationState";
import { setWeekInteractionMotionActive } from "./weekInteractionMotionState";

export type WeekInteractionAdapterMode = "active" | "passive";

export interface WeekInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

interface WeekInteractionAdapterOptions {
  engineOptions?: CalendarInteractionEngineSchedulerOptions;
  mode?: WeekInteractionAdapterMode;
  runtime?: () => WeekInteractionRuntime;
}

export interface WeekInteractionRuntime {
  getAllDayEventById?: (eventId: string) => Schema_GridEvent | null;
  getTimedEventById(eventId: string): Schema_GridEvent | null;
  isEventPending: (eventId: string) => boolean;
  isFormOpen?: () => boolean;
  onClickAllDayEvent?: (event: Schema_GridEvent) => void;
  onClickTimedEvent: (event: Schema_GridEvent) => void;
  onCommitAllDayDrag?: (result: WeekAllDayDragCommitResult) => void;
  onCommitAllDayResize?: (result: WeekAllDayResizeCommitResult) => void;
  onCommitTimedDrag: (result: WeekTimedDragCommitResult) => void;
  onCommitTimedResize?: (result: WeekTimedResizeCommitResult) => void;
  onMotionActivation?: (target: WeekInteractionTarget) => void;
  onRequestWeekNavigation?: (direction: "next" | "prev") => void;
}

export interface WeekAllDayDragCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayDragEnd";
}

export interface WeekAllDayDragTarget {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "allDayDrag";
}

export interface WeekAllDayResizeCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayResizeEnd";
}

export interface WeekAllDayResizeTarget {
  edge: AllDayResizeEdge;
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "allDayResize";
}

export interface WeekTimedDragCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedDragEnd";
}

export interface WeekTimedDragTarget {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "timedDrag";
}

export interface WeekTimedResizeCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedResizeEnd";
}

export interface WeekTimedResizeTarget {
  edge: TimedResizeEdge;
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "timedResize";
}

type WeekInteractionTarget =
  | WeekAllDayDragTarget
  | WeekAllDayResizeTarget
  | WeekTimedDragTarget
  | WeekTimedResizeTarget;
type WeekInteractionVisual =
  | AllDayDragVisual
  | AllDayResizeVisual
  | TimedDragVisual
  | TimedResizeVisual;
type WeekInteractionCommitResult =
  | WeekAllDayDragCommitResult
  | WeekAllDayResizeCommitResult
  | WeekTimedDragCommitResult
  | WeekTimedResizeCommitResult;
type WeekEdgeNavigableVisual = AllDayDragVisual | TimedDragVisual;
type WeekResolvedEventTarget = {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
};

const inertRuntime: WeekInteractionRuntime = {
  getTimedEventById: () => null,
  isEventPending: () => false,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

const EDGE_NAVIGATION_DWELL_MS = 500;
const WEEK_EVENT_RESIZE_HANDLE_ATTRIBUTE = "data-week-event-resize-handle";
const activeEdgeNavigationIndicatorState = {
  currentEdge: null,
  isDragging: true,
  isTimerActive: false,
  progress: 0,
} as const;

export interface WeekInteractionAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): WeekInteractionPointerOwnership;
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
  rebuildLayoutAfterNavigation(): void;
}

export const createWeekInteractionAdapter = ({
  engineOptions,
  mode = "passive",
  runtime = () => inertRuntime,
}: WeekInteractionAdapterOptions = {}): WeekInteractionAdapter => {
  let edgeNavigation: {
    enteredAt: number | null;
    requested: boolean;
    side: "next" | "prev" | null;
  } = { enteredAt: null, requested: false, side: null };
  let isLayoutRebuildPending = false;
  let layout: WeekLayoutCache | null = null;
  let scrollTop: number | null = null;

  const engine: CalendarInteractionEngine<
    WeekInteractionTarget,
    WeekInteractionVisual,
    WeekInteractionCommitResult
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

  function rebuildLayoutAfterNavigation() {
    const session = engine.getSession();

    if (session.phase === "idle") {
      return;
    }

    rebuildLayoutIfNeeded(session.target);
  }

  function handlePointerDown(
    event: PointerEvent,
  ): WeekInteractionPointerOwnership {
    if (mode === "passive") {
      return {
        reason: "passive-week-adapter",
        shouldOwn: false,
      };
    }

    if (!isEligibleWeekPointerDown(event)) {
      return {
        reason: "ineligible-week-pointer",
        shouldOwn: false,
      };
    }

    const target = getInteractionTarget(event);

    if (!target) {
      return {
        reason: "no-week-interaction-target",
        shouldOwn: false,
      };
    }

    if (!engine.handlePointerDown(event)) {
      return {
        reason: "calendar-interaction-engine-busy",
        shouldOwn: false,
      };
    }

    setWeekInteractionMotionActive(true);

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

    if (result.type === "click") {
      const currentRuntime = runtime();

      if (isAllDayTarget(result.target)) {
        currentRuntime.onClickAllDayEvent?.(result.target.event);
      } else {
        currentRuntime.onClickTimedEvent(result.target.event);
      }
      setWeekInteractionMotionActive(false);
      return isOwnedPointer;
    }

    const currentRuntime = runtime();

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
    WeekInteractionTarget,
    WeekInteractionVisual,
    WeekInteractionCommitResult
  > {
    return {
      cancel: () => {
        clearInteractionState();
        resetWeekInteractionEdgeNavigationState();
        setWeekInteractionMotionActive(false);
      },
      commit: ({ target, visual }) => {
        let result: WeekInteractionCommitResult;

        if (visual.type === "allDayDrag" && target.type === "allDayDrag") {
          const movedEvent = allDayDragVisualToGridEvent(target.event, visual);
          result = {
            event: movedEvent,
            eventId: target.event._id!,
            hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
            hasMoved: hasAllDayDragVisualMoved(visual),
            type: "allDayDragEnd",
          };
        } else if (
          visual.type === "allDayResize" &&
          target.type === "allDayResize"
        ) {
          const resizedEvent = allDayResizeVisualToGridEvent(
            target.event,
            visual,
          );
          result = {
            event: resizedEvent,
            eventId: target.event._id!,
            hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
            hasMoved: hasAllDayResizeVisualChanged(visual),
            type: "allDayResizeEnd",
          };
        } else if (
          visual.type === "timedResize" &&
          target.type === "timedResize"
        ) {
          const resizedEvent = timedResizeVisualToGridEvent(
            target.event,
            visual,
          );
          result = {
            event: resizedEvent,
            eventId: target.event._id!,
            hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
            hasMoved: hasTimedResizeVisualMoved(visual),
            type: "timedResizeEnd",
          };
        } else if (visual.type === "timedDrag" && target.type === "timedDrag") {
          const movedEvent = timedDragVisualToGridEvent(target.event, visual);
          result = {
            event: movedEvent,
            eventId: target.event._id!,
            hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
            hasMoved: hasTimedDragVisualMoved(visual),
            type: "timedDragEnd",
          };
        } else {
          throw new Error("Mismatched Week interaction target");
        }

        clearInteractionState();
        resetWeekInteractionEdgeNavigationState();
        setWeekInteractionMotionActive(false);

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const layout = buildWeekLayoutCacheForTarget(target);

        if (!layout) {
          return null;
        }

        const sourceRect = readElementRect(sourceElement);
        setLayout(layout);
        if (isDragTarget(target)) {
          setWeekInteractionEdgeNavigationState(
            activeEdgeNavigationIndicatorState,
          );
        } else {
          resetWeekInteractionEdgeNavigationState();
        }
        runtime().onMotionActivation?.(target);

        if (target.type === "allDayDrag") {
          const visibleRange = getVisibleAllDayRange(layout, sourceRect);

          return createAllDayDragVisual({
            dayIndex: visibleRange.startDayIndex,
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
          });
        }

        if (target.type === "allDayResize") {
          const visibleRange = getVisibleAllDayRange(layout, sourceRect);

          return createAllDayResizeVisual({
            edge: target.edge,
            endDayIndex: visibleRange.endDayIndex,
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
            startDayIndex: visibleRange.startDayIndex,
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
          dayIndex: getLocalDayIndex(target.event.startDate),
          endMinutes: getLocalMinutes(target.event.endDate),
          eventId: target.event._id!,
          pointerStart,
          sourceRect,
          startMinutes: getLocalMinutes(target.event.startDate),
        });
      },
      getOverlayMount: ({ sourceElement, target }) =>
        createWeekInteractionEventOverlayMount({
          cursor: getInteractionCursor(target),
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getTarget: (event) => getInteractionTarget(event),
      updateVisual: ({ pointer, target, timestamp, visual }) => {
        rebuildLayoutIfNeeded(target);

        if (!layout || scrollTop === null) {
          if (visual.type !== "allDayDrag" && visual.type !== "allDayResize") {
            return {
              overlay: null,
              visual,
            };
          }
        }

        if (!layout) {
          return {
            overlay: null,
            visual,
          };
        }

        if (visual.type === "allDayDrag") {
          const nextEdgeNavigation = updateEdgeNavigation(
            visual,
            pointer,
            timestamp,
          );
          const nextVisual = updateAllDayDragVisual(nextEdgeNavigation.visual, {
            layout,
            pointer,
          });

          return {
            overlay: {
              transform: nextVisual.transform,
            },
            shouldContinue: nextEdgeNavigation.isDwellActive,
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
          const nextVisual = updateTimedResizeVisual(visual, {
            layout,
            pointer,
          });
          const nextEvent = timedResizeVisualToGridEvent(
            target.event,
            nextVisual,
          );

          return {
            overlay: {
              height: nextVisual.height,
              mutate: (node) => updateOverlayTimeLabel(node, nextEvent),
              transform: nextVisual.transform,
            },
            visual: nextVisual,
          };
        }

        if (target.type !== "timedDrag") {
          throw new Error("Mismatched Week interaction target");
        }

        const smartScroll = applySmartScroll(pointer);
        const nextEdgeNavigation = updateEdgeNavigation(
          visual,
          pointer,
          timestamp,
        );
        const nextVisual = updateTimedDragVisual(nextEdgeNavigation.visual, {
          layout,
          pointer,
          scrollDeltaPx: smartScroll.scrollDeltaPx,
        });
        const nextEvent = timedDragVisualToGridEvent(target.event, nextVisual);

        return {
          overlay: {
            mutate: (node) => updateOverlayTimeLabel(node, nextEvent),
            transform: nextVisual.transform,
          },
          shouldContinue:
            smartScroll.isScrolling || nextEdgeNavigation.isDwellActive,
          visual: nextVisual,
        };
      },
    };
  }

  function getInteractionTarget(
    event: PointerEvent,
  ): WeekInteractionTarget | null {
    const allDayResizeTarget = getAllDayResizeTarget(event);

    if (allDayResizeTarget) {
      return allDayResizeTarget;
    }

    const resizeTarget = getTimedResizeTarget(event);

    if (resizeTarget) {
      return resizeTarget;
    }

    const timedDragTarget = getTimedDragTarget(event);

    if (timedDragTarget) {
      return timedDragTarget;
    }

    return getAllDayDragTarget(event);
  }

  function getAllDayDragTarget(
    event: PointerEvent,
  ): WeekAllDayDragTarget | null {
    if (mode !== "active") {
      return null;
    }

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
  ): WeekAllDayResizeTarget | null {
    if (mode !== "active") {
      return null;
    }

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

  function getTimedDragTarget(event: PointerEvent): WeekTimedDragTarget | null {
    if (mode !== "active") {
      return null;
    }

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
  ): WeekTimedResizeTarget | null {
    if (mode !== "active") {
      return null;
    }

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
  ): WeekResolvedEventTarget | null {
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
  ): WeekResolvedEventTarget | null {
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
    eventType: WeekInteractionEventType,
  ) {
    const registered = weekEventRegistry.resolveFromTarget(event.target);

    return registered?.eventType === eventType ? registered : null;
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

  function updateEdgeNavigation<TVisual extends WeekEdgeNavigableVisual>(
    visual: TVisual,
    pointer: VisualPoint,
    timestamp: number,
  ): { isDwellActive: boolean; visual: TVisual } {
    if (!layout) {
      resetEdgeNavigation();
      setWeekInteractionEdgeNavigationState(activeEdgeNavigationIndicatorState);
      return { isDwellActive: false, visual };
    }

    const side = getEdgeNavigationSide(layout.edgeNavigation, pointer);

    if (!side) {
      resetEdgeNavigation();
      setWeekInteractionEdgeNavigationState(activeEdgeNavigationIndicatorState);
      return { isDwellActive: false, visual };
    }

    if (edgeNavigation.side !== side) {
      edgeNavigation = {
        enteredAt: timestamp,
        requested: false,
        side,
      };
      setWeekInteractionEdgeNavigationState({
        currentEdge: side === "prev" ? "left" : "right",
        isDragging: true,
        isTimerActive: true,
        progress: 0,
      });

      return { isDwellActive: true, visual };
    }

    const progress =
      edgeNavigation.enteredAt === null
        ? 0
        : Math.min(
            ((timestamp - edgeNavigation.enteredAt) /
              EDGE_NAVIGATION_DWELL_MS) *
              100,
            100,
          );

    if (
      edgeNavigation.enteredAt !== null &&
      !edgeNavigation.requested &&
      timestamp - edgeNavigation.enteredAt >= EDGE_NAVIGATION_DWELL_MS
    ) {
      edgeNavigation.requested = true;
      isLayoutRebuildPending = true;
      setWeekInteractionEdgeNavigationState({
        currentEdge: side === "prev" ? "left" : "right",
        isDragging: true,
        isTimerActive: false,
        progress: 0,
      });
      runtime().onRequestWeekNavigation?.(side);

      return {
        isDwellActive: false,
        visual: {
          ...visual,
          weekOffsetDays: visual.weekOffsetDays + (side === "next" ? 7 : -7),
        } as TVisual,
      };
    }

    setWeekInteractionEdgeNavigationState({
      currentEdge: side === "prev" ? "left" : "right",
      isDragging: true,
      isTimerActive: !edgeNavigation.requested,
      progress,
    });

    return {
      isDwellActive: !edgeNavigation.requested,
      visual,
    };
  }

  function rebuildLayoutIfNeeded(target: WeekInteractionTarget) {
    if (!isLayoutRebuildPending) {
      return;
    }

    const nextLayout = buildWeekLayoutCacheForTarget(target);

    if (!nextLayout) {
      return;
    }

    setLayout(nextLayout);
    isLayoutRebuildPending = false;
  }

  function resetEdgeNavigation() {
    edgeNavigation = {
      enteredAt: null,
      requested: false,
      side: null,
    };
  }

  function clearInteractionState() {
    layout = null;
    scrollTop = null;
    resetEdgeNavigation();
    isLayoutRebuildPending = false;
  }

  function setLayout(nextLayout: WeekLayoutCache) {
    layout = nextLayout;
    scrollTop = nextLayout.smartScroll?.initialScrollTop ?? null;
  }

  return {
    cancel,
    connectCancellationEvents,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    ownsPointer,
    rebuildLayoutAfterNavigation,
  };
};

const isAllDayTarget = (
  target: WeekInteractionTarget,
): target is WeekAllDayDragTarget | WeekAllDayResizeTarget =>
  target.type === "allDayDrag" || target.type === "allDayResize";

const isDragTarget = (
  target: WeekInteractionTarget,
): target is WeekAllDayDragTarget | WeekTimedDragTarget =>
  target.type === "allDayDrag" || target.type === "timedDrag";

const getOwnershipReason = (target: WeekInteractionTarget) => {
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

const getInteractionCursor = (target: WeekInteractionTarget) => {
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

const getResizeHandleEdge = (event: PointerEvent): AllDayResizeEdge | null => {
  const pointerTarget = event.target instanceof Element ? event.target : null;
  const handle = pointerTarget?.closest<HTMLElement>(
    `[${WEEK_EVENT_RESIZE_HANDLE_ATTRIBUTE}]`,
  );
  const edge = handle?.getAttribute(WEEK_EVENT_RESIZE_HANDLE_ATTRIBUTE);

  return isResizeEdge(edge) ? edge : null;
};

const isResizeEdge = (
  edge: string | null | undefined,
): edge is AllDayResizeEdge => edge === "startDate" || edge === "endDate";

const buildWeekLayoutCacheForTarget = (target: WeekInteractionTarget) =>
  isAllDayTarget(target)
    ? buildAllDayWeekLayoutCache()
    : buildTimedWeekLayoutCache();

const isEligibleWeekPointerDown = (event: PointerEvent) =>
  event.isPrimary !== false &&
  event.button === 0 &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

const readElementRect = (element: HTMLElement): VisualRect => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};

const getLocalMinutes = (dateString: string | undefined) => {
  const date = new Date(dateString ?? 0);

  return date.getHours() * 60 + date.getMinutes();
};

const getLocalDayIndex = (dateString: string | undefined) =>
  getLocalDate(dateString).getDay();

const getVisibleAllDayRange = (
  layout: WeekLayoutCache,
  sourceRect: VisualRect,
) => {
  const startColumn = getNearestDayColumn(
    layout.dayColumns,
    sourceRect.left + 1,
  );
  const endColumn = getNearestDayColumn(
    layout.dayColumns,
    sourceRect.left + Math.max(1, sourceRect.width),
  );
  const startDayIndex = startColumn?.index ?? 0;
  const endDayIndex = Math.max(
    startDayIndex,
    endColumn?.index ?? startDayIndex,
  );

  return {
    endDayIndex,
    startDayIndex,
  };
};

const getLocalDate = (dateString: string | undefined) => {
  if (!dateString) {
    return new Date(0);
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]!),
      Number(dateOnly[2]!) - 1,
      Number(dateOnly[3]!),
    );
  }

  return new Date(dateString);
};

const getEdgeNavigationSide = (
  edgeNavigation: WeekEdgeNavigationCache,
  pointer: VisualPoint,
) => {
  const isInVerticalBounds =
    pointer.y >= edgeNavigation.top && pointer.y <= edgeNavigation.bottom;

  if (!isInVerticalBounds) {
    return null;
  }

  if (pointer.x < edgeNavigation.left + edgeNavigation.edgeThresholdPx) {
    return "prev" as const;
  }

  if (pointer.x > edgeNavigation.right - edgeNavigation.edgeThresholdPx) {
    return "next" as const;
  }

  return null;
};

const updateOverlayTimeLabel = (node: HTMLElement, event: Schema_GridEvent) => {
  const timeLabel = node.querySelector<HTMLElement>("[role='textbox']");

  if (!timeLabel || !event.startDate || !event.endDate) {
    return;
  }

  timeLabel.textContent = getTimesLabel(event.startDate, event.endDate);
};
