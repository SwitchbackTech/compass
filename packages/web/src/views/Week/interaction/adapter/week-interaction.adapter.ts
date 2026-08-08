import {
  applySmartScroll as applySmartScrollFrame,
  getSavedEventInteractionCursor,
  getSavedEventOwnershipReason,
  readElementRect,
} from "@web/grid/interaction/adapter.helpers";
import {
  createDraftEventMount,
  getResizeHandleEdge,
  hideDraftEventTimeLabel,
  updateDraftEventTimeLabel,
} from "@web/grid/interaction/dom";
import {
  getDragRowLayouts,
  resolveDragRow,
} from "@web/grid/interaction/math/cross-row.drag";
import {
  type CrossRowSize,
  type VisualPoint,
  type VisualRect,
} from "@web/grid/interaction/types/timed-drag.types";
import { calendarEventIdValueSelector } from "@web/grid/interaction/view-event-registry";
import { type InteractionAdapter } from "@web/interaction/interaction.adapter.types";
import {
  createInteractionEngine,
  type InteractionCancellationTargets,
  type InteractionEngine,
} from "@web/interaction/interaction.engine";
import { isEligibleInteractionPointerDown } from "@web/interaction/interaction.pointer";
import {
  type WeekInteractionEventType,
  weekEventRegistry,
} from "../registry/week-event.registry";
import {
  resetWeekInteractionEdgeNavigationState,
  setWeekInteractionEdgeNavigationState,
} from "../state/edge-navigation.state";
import { setWeekInteractionMotionActive } from "../state/motion.state";
import { createWeekEdgeNavigationController } from "./edge-navigation";
import {
  buildAllDayWeekLayoutCache,
  buildDragWeekLayoutCache,
  buildTimedWeekLayoutCache,
  type WeekLayoutCache,
  type WeekLayoutCacheInput,
} from "./geometry/week-layout.cache";
import {
  commitAllDayDragInteraction,
  createAllDayDragInteractionVisual,
  updateAllDayDragInteractionVisual,
} from "./interactions/all-day.drag";
import {
  commitAllDayResizeInteraction,
  createAllDayResizeInteractionVisual,
  updateAllDayResizeInteractionVisual,
} from "./interactions/all-day.resize";
import {
  commitTimedDragInteraction,
  createTimedDragInteractionVisual,
  updateTimedDragInteractionVisual,
} from "./interactions/timed.drag";
import {
  commitTimedResizeInteraction,
  createTimedResizeInteractionVisual,
  updateTimedResizeInteractionVisual,
} from "./interactions/timed.resize";
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
} from "./week-interaction.adapter.types";

export type {
  WeekAllDayDragCommitResult,
  WeekAllDayResizeCommitResult,
  WeekInteractionAdapter,
  WeekInteractionRuntime,
  WeekTimedDragCommitResult,
  WeekTimedResizeCommitResult,
} from "./week-interaction.adapter.types";

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

  const engine: InteractionEngine<
    WeekInteractionTarget,
    WeekInteractionVisual,
    WeekInteractionCommitResult
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

  function rebuildLayoutAfterNavigation() {
    const session = engine.getSession();

    if (session.phase === "idle") {
      return;
    }

    rebuildLayoutIfNeeded(session.target);

    // Edge-nav remounts event cards; re-dim/hide the source on the new node
    // so the placeholder style survives dragging across weeks.
    if (session.phase === "pending" || session.phase === "motion") {
      const { eventId, eventType } = session.target.registered;
      const nextElement =
        weekEventRegistry.resolve(eventId, eventType) ??
        document.querySelector<HTMLElement>(
          calendarEventIdValueSelector(eventId),
        );
      if (nextElement) {
        engine.rebindPreparedSource(nextElement);
      }
    }
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
      reason: getSavedEventOwnershipReason(target.type),
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

  function createEngineAdapter(): InteractionAdapter<
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
      getDraftEventMount: ({ sourceElement, target }) =>
        createDraftEventMount({
          cursor: getSavedEventInteractionCursor(target.type),
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getSourceElementDraftEventMode: (target) =>
        isDragTarget(target) ? "dim-source" : "hide-source",
      getTarget: (event) => getInteractionTarget(event),
      updateVisual: ({ pointer, target, timestamp, visual }) => {
        rebuildLayoutIfNeeded(target);

        if (!layout || scrollTop === null) {
          if (visual.type !== "allDayDrag" && visual.type !== "allDayResize") {
            return {
              draftEvent: null,
              visual,
            };
          }
        }

        if (!layout) {
          return {
            draftEvent: null,
            visual,
          };
        }

        if (visual.type === "allDayDrag") {
          if (target.type !== "allDayDrag") {
            throw new Error("Mismatched Week interaction target");
          }

          const nextEdgeNavigation = updateEdgeNavigation(
            visual,
            pointer,
            timestamp,
          );
          const next = updateAllDayDragInteractionVisual({
            layout,
            pointer,
            target,
            visual: nextEdgeNavigation.visual,
          });

          return {
            draftEvent: {
              ...getDraftEventSize(next.visual),
              mutate: (node) =>
                next.event
                  ? updateDraftEventTimeLabel(node, next.event)
                  : undefined,
              transform: next.visual.transform,
            },
            shouldContinue: nextEdgeNavigation.isDwellActive,
            visual: next.visual,
          };
        }

        if (visual.type === "allDayResize") {
          const nextVisual = updateAllDayResizeInteractionVisual({
            layout,
            pointer,
            visual,
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
            draftEvent: {
              height: next.visual.height,
              mutate: (node) => updateDraftEventTimeLabel(node, next.event),
              transform: next.visual.transform,
            },
            shouldContinue: smartScroll.isScrolling,
            visual: next.visual,
          };
        }

        if (target.type !== "timedDrag") {
          throw new Error("Mismatched Week interaction target");
        }

        // Suppressed while the pointer is over the all-day row: the timed grid
        // isn't the drop target any more, so nudging its scroll would just yank
        // the view around behind the ghost.
        const smartScroll = isPointerOverAllDayRow(pointer)
          ? { isScrolling: false, scrollDeltaPx: 0 }
          : applySmartScroll(pointer);
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
          draftEvent: {
            ...getDraftEventSize(next.visual),
            mutate: (node) =>
              next.event
                ? updateDraftEventTimeLabel(node, next.event)
                : hideDraftEventTimeLabel(node),
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

  function isPointerOverAllDayRow(pointer: VisualPoint) {
    if (!layout) {
      return false;
    }

    const { allDay, timed } = getDragRowLayouts(layout, "timed");

    return (
      resolveDragRow({
        allDay,
        pointerY: pointer.y,
        sourceRow: "timed",
        timed,
      }) === "allDay"
    );
  }

  function applySmartScroll(pointer: VisualPoint) {
    const result = applySmartScrollFrame({ layout, pointer, scrollTop });
    scrollTop = result.scrollTop;
    return {
      isScrolling: result.isScrolling,
      scrollDeltaPx: result.scrollDeltaPx,
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

// Drags cache both rows so they can be dropped across them; resizes stay within
// one row and only need their own.
const buildWeekLayoutCacheForTarget = (
  target: WeekInteractionTarget,
  input: WeekLayoutCacheInput,
) => {
  if (isDragTarget(target)) {
    return buildDragWeekLayoutCache(
      input,
      target.type === "allDayDrag" ? "allDay" : "timed",
    );
  }

  return isAllDayTarget(target)
    ? buildAllDayWeekLayoutCache(input)
    : buildTimedWeekLayoutCache(input);
};

// Always explicit for drags: the clone keeps whatever size it was last given,
// so returning to the drag's own row has to actively restore the source card's
// box rather than just stop overriding it.
const getDraftEventSize = (visual: {
  crossRowSize: CrossRowSize;
  sourceRect: VisualRect;
}) =>
  visual.crossRowSize ?? {
    height: visual.sourceRect.height,
    width: visual.sourceRect.width,
  };

const isEligibleWeekPointerDown = isEligibleInteractionPointerDown;
