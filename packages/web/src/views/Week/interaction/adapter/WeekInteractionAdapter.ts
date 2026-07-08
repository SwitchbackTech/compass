import {
  createCalendarInteractionEventOverlayMount,
  getCalendarResizeHandleEdge,
  updateCalendarOverlayTimeLabel,
} from "@web/common/calendar-grid/interaction/calendarInteractionDom";
import { getSmartScrollFrame } from "@web/common/calendar-grid/interaction/math/smartScroll";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/common/calendar-grid/interaction/model/TimedDragVisual";
import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngine,
  createCalendarInteractionEngine,
} from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { isEligibleCalendarInteractionPointerDown } from "@web/common/calendar-interaction/calendarInteractionPointer";
import {
  type WeekInteractionEventType,
  weekEventRegistry,
} from "../registry/weekEventRegistry";
import {
  resetWeekInteractionEdgeNavigationState,
  setWeekInteractionEdgeNavigationState,
} from "../state/weekInteractionEdgeNavigationState";
import { setWeekInteractionMotionActive } from "../state/weekInteractionMotionState";
import {
  buildAllDayWeekLayoutCache,
  buildTimedWeekLayoutCache,
  type WeekLayoutCache,
  type WeekLayoutCacheInput,
} from "./geometry/weekLayoutCache";
import {
  commitAllDayDragInteraction,
  createAllDayDragInteractionVisual,
  updateAllDayDragInteractionVisual,
} from "./interactions/allDayEventDragInteraction";
import {
  commitAllDayResizeInteraction,
  createAllDayResizeInteractionVisual,
  updateAllDayResizeInteractionVisual,
} from "./interactions/allDayEventResizeInteraction";
import {
  commitTimedDragInteraction,
  createTimedDragInteractionVisual,
  updateTimedDragInteractionVisual,
} from "./interactions/timedEventDragInteraction";
import {
  commitTimedResizeInteraction,
  createTimedResizeInteractionVisual,
  updateTimedResizeInteractionVisual,
} from "./interactions/timedEventResizeInteraction";
import {
  type WeekAllDayDragTarget,
  type WeekAllDayResizeTarget,
  type WeekEdgeNavigableVisual,
  type WeekInteractionAdapter,
  type WeekInteractionAdapterOptions,
  type WeekInteractionCommitResult,
  type WeekInteractionPointerOwnership,
  type WeekInteractionRuntime,
  type WeekInteractionTarget,
  type WeekInteractionVisual,
  type WeekResolvedEventTarget,
  type WeekTimedDragTarget,
  type WeekTimedResizeTarget,
} from "./WeekInteractionAdapter.types";
import { createWeekEdgeNavigationController } from "./weekEdgeNavigation";

export type {
  WeekAllDayDragCommitResult,
  WeekAllDayResizeCommitResult,
  WeekInteractionAdapter,
  WeekInteractionRuntime,
  WeekTimedDragCommitResult,
  WeekTimedResizeCommitResult,
} from "./WeekInteractionAdapter.types";

const inertRuntime: WeekInteractionRuntime = {
  getTimedEventById: () => null,
  getVisibleDays: () => [],
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

const activeEdgeNavigationIndicatorState = {
  currentEdge: null,
  isDragging: true,
  isTimerActive: false,
  progress: 0,
} as const;

export const createWeekInteractionAdapter = ({
  engineOptions,
  getLayoutSources = () => ({}),
  runtime = () => inertRuntime,
}: WeekInteractionAdapterOptions = {}): WeekInteractionAdapter => {
  const edgeNavigation = createWeekEdgeNavigationController();
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
          result = commitAllDayDragInteraction(target, visual);
        } else if (
          visual.type === "allDayResize" &&
          target.type === "allDayResize"
        ) {
          result = commitAllDayResizeInteraction(target, visual);
        } else if (
          visual.type === "timedResize" &&
          target.type === "timedResize"
        ) {
          result = commitTimedResizeInteraction(target, visual);
        } else if (visual.type === "timedDrag" && target.type === "timedDrag") {
          result = commitTimedDragInteraction(target, visual);
        } else {
          throw new Error("Mismatched Week interaction target");
        }

        clearInteractionState();
        resetWeekInteractionEdgeNavigationState();
        setWeekInteractionMotionActive(false);

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const layout = buildWeekLayoutCacheForTarget(target, getLayoutInput());

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
          return createAllDayDragInteractionVisual({
            layout,
            pointerStart,
            sourceRect,
            target,
          });
        }

        if (target.type === "allDayResize") {
          return createAllDayResizeInteractionVisual({
            layout,
            pointerStart,
            sourceRect,
            target,
          });
        }

        if (target.type === "timedResize") {
          return createTimedResizeInteractionVisual({
            pointerStart,
            sourceRect,
            target,
          });
        }

        return createTimedDragInteractionVisual({
          layout,
          pointerStart,
          sourceRect,
          target,
        });
      },
      getOverlayMount: ({ sourceElement }) =>
        createCalendarInteractionEventOverlayMount({
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getSourceElementOverlayMode: (target) =>
        isDragTarget(target) ? "dim-source" : "hide-source",
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
          const nextVisual = updateAllDayDragInteractionVisual({
            layout,
            pointer,
            visual: nextEdgeNavigation.visual,
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
          const nextVisual = updateAllDayResizeInteractionVisual({
            layout,
            pointer,
            visual,
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
            throw new Error("Mismatched Week interaction target");
          }

          const smartScroll = applySmartScroll(pointer);
          const next = updateTimedResizeInteractionVisual({
            layout,
            pointer,
            scrollDeltaPx: smartScroll.scrollDeltaPx,
            target,
            visual,
          });

          return {
            overlay: {
              height: next.visual.height,
              mutate: (node) =>
                updateCalendarOverlayTimeLabel(node, next.event),
              transform: next.visual.transform,
            },
            shouldContinue: smartScroll.isScrolling,
            visual: next.visual,
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
        const next = updateTimedDragInteractionVisual({
          layout,
          pointer,
          scrollDeltaPx: smartScroll.scrollDeltaPx,
          target,
          visual: nextEdgeNavigation.visual,
        });

        return {
          overlay: {
            mutate: (node) => updateCalendarOverlayTimeLabel(node, next.event),
            transform: next.visual.transform,
          },
          shouldContinue:
            smartScroll.isScrolling || nextEdgeNavigation.isDwellActive,
          visual: next.visual,
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
  ): WeekAllDayResizeTarget | null {
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

  function getTimedDragTarget(event: PointerEvent): WeekTimedDragTarget | null {
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
  ): WeekTimedResizeTarget | null {
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
  ): WeekResolvedEventTarget | null {
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
  ): WeekResolvedEventTarget | null {
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
    eventType: WeekInteractionEventType,
  ) {
    const registered = weekEventRegistry.resolveFromTarget(event.target);

    return registered?.eventType === eventType ? registered : null;
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

    const update = edgeNavigation.update({
      bounds: layout.edgeNavigation,
      pointer,
      timestamp,
    });

    setWeekInteractionEdgeNavigationState(update.state);

    if (update.requestedSide) {
      // No day bookkeeping: the pending layout rebuild carries the new column
      // dates, and the visual re-resolves its dayDate against them.
      isLayoutRebuildPending = true;
      runtime().onRequestWeekNavigation?.(update.requestedSide);

      return {
        isDwellActive: false,
        visual,
      };
    }

    return {
      isDwellActive: update.isDwellActive,
      visual,
    };
  }

  function getLayoutInput(): WeekLayoutCacheInput {
    return {
      ...getLayoutSources(),
      visibleDays: runtime().getVisibleDays(),
    };
  }

  function rebuildLayoutIfNeeded(target: WeekInteractionTarget) {
    if (!isLayoutRebuildPending) {
      return;
    }

    const nextLayout = buildWeekLayoutCacheForTarget(target, getLayoutInput());

    if (!nextLayout) {
      return;
    }

    setLayout(nextLayout);
    isLayoutRebuildPending = false;
  }

  function resetEdgeNavigation() {
    edgeNavigation.reset();
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

const buildWeekLayoutCacheForTarget = (
  target: WeekInteractionTarget,
  input: WeekLayoutCacheInput,
) =>
  isAllDayTarget(target)
    ? buildAllDayWeekLayoutCache(input)
    : buildTimedWeekLayoutCache(input);

const isEligibleWeekPointerDown = isEligibleCalendarInteractionPointerDown;

const readElementRect = (element: HTMLElement): VisualRect => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};
