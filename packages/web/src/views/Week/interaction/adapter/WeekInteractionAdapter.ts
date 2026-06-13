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
import { somedayDropTargetRegistry } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry";
import {
  type SomedayInteractionCategory,
  somedayEventRegistry,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import {
  EVENT_ALLDAY_HEIGHT,
  TIMED_EVENT_COLUMN_INSET,
} from "../../layout.constants";
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
  getNearestDayColumn,
  type WeekLayoutCache,
  type WeekLayoutCacheSources,
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
  WeekCalendarToSidebarCommitResult,
  WeekInteractionAdapter,
  WeekInteractionRuntime,
  WeekTimedDragCommitResult,
  WeekTimedResizeCommitResult,
} from "./WeekInteractionAdapter.types";

const inertRuntime: WeekInteractionRuntime = {
  getTimedEventById: () => null,
  isEventPending: () => false,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

const activeEdgeNavigationIndicatorState = {
  currentEdge: null,
  isDragging: true,
  isTimerActive: false,
  progress: 0,
} as const;
const CROSS_SURFACE_SNAP_TRANSITION =
  "height 160ms cubic-bezier(0.16, 1, 0.3, 1), width 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 120ms cubic-bezier(0.16, 1, 0.3, 1)";
// Shape-only: transform must follow the pointer without easing outside the
// snapped cross-surface mode, while still animating the size restore.
const SHAPE_SNAP_TRANSITION =
  "height 160ms cubic-bezier(0.16, 1, 0.3, 1), width 160ms cubic-bezier(0.16, 1, 0.3, 1)";
const DEFAULT_CONVERTED_TIMED_DURATION_MINUTES = 60;
const MINUTES_PER_DAY = 24 * 60;

interface WeekSidebarDrop {
  category: SomedayInteractionCategory;
  index: number;
  type: "sidebar";
}

type WeekSidebarDroppableVisual = WeekEdgeNavigableVisual & {
  sidebarDrop?: WeekSidebarDrop | null;
};

export const createWeekInteractionAdapter = ({
  engineOptions,
  getLayoutSources = () => ({}),
  runtime = () => inertRuntime,
}: WeekInteractionAdapterOptions = {}): WeekInteractionAdapter => {
  const edgeNavigation = createWeekEdgeNavigationController();
  let isLayoutRebuildPending = false;
  let allDayLayout: WeekLayoutCache | null = null;
  let crossSurfaceScrollTop: number | null = null;
  let lastReportedSidebarCategory: SomedayInteractionCategory | null = null;
  let layout: WeekLayoutCache | null = null;
  let scrollTop: number | null = null;
  let timedLayout: WeekLayoutCache | null = null;

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

    if (result.result.type === "calendarToSidebar") {
      currentRuntime.onCommitCalendarToSidebar?.(result.result);
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
        const sidebarDrop = getVisualSidebarDrop(visual);

        if (sidebarDrop && isDragTarget(target)) {
          result = {
            category: sidebarDrop.category,
            event: target.event,
            eventId: target.event._id!,
            hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
            index: sidebarDrop.index,
            type: "calendarToSidebar",
          };
        } else if (
          visual.type === "allDayDrag" &&
          target.type === "allDayDrag"
        ) {
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
        const layout = buildWeekLayoutCacheForTarget(
          target,
          getLayoutSources(),
        );

        if (!layout) {
          return null;
        }

        const sourceRect = readElementRect(sourceElement);
        setLayout(layout);
        if (isDragTarget(target)) {
          setCrossSurfaceLayouts(getLayoutSources());
        } else {
          clearCrossSurfaceLayouts();
        }
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
          pointerStart,
          sourceRect,
          target,
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
          const sidebarDrop = resolveSidebarDrop(pointer);

          reportSidebarPreview(sidebarDrop?.category ?? null);

          if (sidebarDrop) {
            return updateSidebarDropVisual(visual, pointer, sidebarDrop);
          }

          const nextEdgeNavigation = updateEdgeNavigation(
            visual,
            pointer,
            timestamp,
          );
          const timedDrop = resolveTimedCrossSurfaceDrop(pointer);

          if (timedDrop) {
            const crossSurfaceScroll = applyCrossSurfaceSmartScroll(pointer);
            const overlayRect = getTimedCrossSurfaceOverlayRect(
              timedDrop,
              nextEdgeNavigation.visual,
            );
            const nextVisual = {
              ...nextEdgeNavigation.visual,
              crossSurfaceDrop: timedDrop,
              transform: {
                x: overlayRect.left - nextEdgeNavigation.visual.sourceRect.left,
                y: overlayRect.top - nextEdgeNavigation.visual.sourceRect.top,
              },
            };

            return {
              overlay: {
                height: overlayRect.height,
                mutate: applyCrossSurfaceSnapTransition,
                transform: nextVisual.transform,
                width: overlayRect.width,
              },
              shouldContinue:
                crossSurfaceScroll.isScrolling ||
                nextEdgeNavigation.isDwellActive,
              visual: nextVisual,
            };
          }

          const nextVisual = updateAllDayDragInteractionVisual({
            layout,
            pointer,
            visual: {
              ...nextEdgeNavigation.visual,
              crossSurfaceDrop: null,
              sidebarDrop: null,
            },
          });

          return {
            overlay: {
              height: nextVisual.sourceRect.height,
              mutate: applyShapeSnapTransition,
              transform: nextVisual.transform,
              width: nextVisual.sourceRect.width,
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

          const next = updateTimedResizeInteractionVisual({
            layout,
            pointer,
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
            visual: next.visual,
          };
        }

        if (target.type !== "timedDrag") {
          throw new Error("Mismatched Week interaction target");
        }

        const sidebarDrop = resolveSidebarDrop(pointer);

        reportSidebarPreview(sidebarDrop?.category ?? null);

        if (sidebarDrop) {
          return updateSidebarDropVisual(visual, pointer, sidebarDrop);
        }

        const nextEdgeNavigation = updateEdgeNavigation(
          visual,
          pointer,
          timestamp,
        );
        const allDayDrop = resolveAllDayCrossSurfaceDrop(pointer);

        if (allDayDrop) {
          const overlayRect = getAllDayCrossSurfaceOverlayRect(
            allDayDrop,
            nextEdgeNavigation.visual,
          );
          const nextVisual = {
            ...nextEdgeNavigation.visual,
            crossSurfaceDrop: allDayDrop,
            transform: {
              x: overlayRect.left - nextEdgeNavigation.visual.sourceRect.left,
              y: overlayRect.top - nextEdgeNavigation.visual.sourceRect.top,
            },
          };

          return {
            overlay: {
              height: overlayRect.height,
              mutate: applyCrossSurfaceSnapTransition,
              transform: nextVisual.transform,
              width: overlayRect.width,
            },
            shouldContinue: nextEdgeNavigation.isDwellActive,
            visual: nextVisual,
          };
        }

        const smartScroll = applySmartScroll(pointer);
        const next = updateTimedDragInteractionVisual({
          layout,
          pointer,
          scrollDeltaPx: smartScroll.scrollDeltaPx,
          target,
          visual: {
            ...nextEdgeNavigation.visual,
            crossSurfaceDrop: null,
            sidebarDrop: null,
          },
        });

        return {
          overlay: {
            height: next.visual.sourceRect.height,
            mutate: (node) => {
              applyShapeSnapTransition(node);
              updateCalendarOverlayTimeLabel(node, next.event);
            },
            transform: next.visual.transform,
            width: next.visual.sourceRect.width,
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

    const update = edgeNavigation.update({
      bounds: layout.edgeNavigation,
      pointer,
      timestamp,
    });

    setWeekInteractionEdgeNavigationState(update.state);

    if (update.requestedSide) {
      isLayoutRebuildPending = true;
      runtime().onRequestWeekNavigation?.(update.requestedSide);

      return {
        isDwellActive: false,
        visual: {
          ...visual,
          weekOffsetDays: visual.weekOffsetDays + update.weekOffsetDaysDelta,
        } as TVisual,
      };
    }

    return {
      isDwellActive: update.isDwellActive,
      visual,
    };
  }

  function rebuildLayoutIfNeeded(target: WeekInteractionTarget) {
    if (!isLayoutRebuildPending) {
      return;
    }

    const nextLayout = buildWeekLayoutCacheForTarget(
      target,
      getLayoutSources(),
    );

    if (!nextLayout) {
      return;
    }

    setLayout(nextLayout);
    if (isDragTarget(target)) {
      setCrossSurfaceLayouts(getLayoutSources());
    }
    isLayoutRebuildPending = false;
  }

  function resetEdgeNavigation() {
    edgeNavigation.reset();
  }

  function clearInteractionState() {
    layout = null;
    scrollTop = null;
    clearCrossSurfaceLayouts();
    // Runs on both commit and cancel, so it clears the sidebar drop-zone
    // styling for Escape, pointercancel, regular grid drops, and sidebar drops.
    reportSidebarPreview(null);
    resetEdgeNavigation();
    isLayoutRebuildPending = false;
  }

  function setLayout(nextLayout: WeekLayoutCache) {
    layout = nextLayout;
    scrollTop = nextLayout.smartScroll?.initialScrollTop ?? null;
  }

  function setCrossSurfaceLayouts(sources: WeekLayoutCacheSources) {
    allDayLayout = buildAllDayWeekLayoutCache(sources);
    timedLayout = buildTimedWeekLayoutCache(sources);
    crossSurfaceScrollTop = timedLayout?.smartScroll?.initialScrollTop ?? null;
  }

  function clearCrossSurfaceLayouts() {
    allDayLayout = null;
    crossSurfaceScrollTop = null;
    timedLayout = null;
  }

  // Mirrors applySmartScroll for an all-day drag hovering the timed grid,
  // where the active layout cache has no smart-scroll element of its own.
  function applyCrossSurfaceSmartScroll(pointer: VisualPoint) {
    if (!timedLayout?.smartScroll || crossSurfaceScrollTop === null) {
      return { isScrolling: false };
    }

    const frame = getSmartScrollFrame({
      cache: timedLayout.smartScroll,
      pointerY: pointer.y,
      scrollTop: crossSurfaceScrollTop,
    });

    if (frame.scrollTop !== crossSurfaceScrollTop) {
      timedLayout.smartScroll.element.scrollTop = frame.scrollTop;
      crossSurfaceScrollTop = frame.scrollTop;
    }

    return { isScrolling: frame.velocityPx !== 0 };
  }

  function updateSidebarDropVisual<TVisual extends WeekEdgeNavigableVisual>(
    visual: TVisual,
    pointer: VisualPoint,
    sidebarDrop: WeekSidebarDrop,
  ) {
    // Parking over a sidebar drop zone must not dwell-navigate weeks or
    // smart-scroll the grid; the pointer is outside both surfaces.
    resetEdgeNavigation();
    setWeekInteractionEdgeNavigationState(activeEdgeNavigationIndicatorState);

    const nextVisual = {
      ...visual,
      crossSurfaceDrop: null,
      sidebarDrop,
      transform: {
        x: pointer.x - visual.pointerStart.x,
        y: pointer.y - visual.pointerStart.y,
      },
    };

    return {
      overlay: {
        height: visual.sourceRect.height,
        mutate: applyShapeSnapTransition,
        transform: nextVisual.transform,
        width: visual.sourceRect.width,
      },
      shouldContinue: false,
      visual: nextVisual,
    };
  }

  function resolveAllDayCrossSurfaceDrop(pointer: VisualPoint) {
    const crossLayout = allDayLayout;

    if (!crossLayout || !isPointInLayout(pointer, crossLayout)) {
      return null;
    }

    const column = getNearestDayColumn(crossLayout.dayColumns, pointer.x);

    if (!column || !isPointInsideColumns(pointer, crossLayout.dayColumns)) {
      return null;
    }

    return {
      dayIndex: column.index,
      type: "allDay" as const,
    };
  }

  function resolveTimedCrossSurfaceDrop(pointer: VisualPoint) {
    const crossLayout = timedLayout;

    if (!crossLayout || !isPointInLayout(pointer, crossLayout)) {
      return null;
    }

    const column = getNearestDayColumn(crossLayout.dayColumns, pointer.x);

    if (!column || !isPointInsideColumns(pointer, crossLayout.dayColumns)) {
      return null;
    }

    const gridY =
      pointer.y -
      crossLayout.edgeNavigation.top +
      (crossLayout.smartScroll?.element.scrollTop ?? 0);
    // Clamp so the converted event still ends within the dropped day.
    const latestStartMinutes =
      MINUTES_PER_DAY - DEFAULT_CONVERTED_TIMED_DURATION_MINUTES;
    const startMinutes = Math.min(
      latestStartMinutes,
      Math.max(
        0,
        Math.floor(
          gridY / crossLayout.pixelsPerMinute / crossLayout.snapMinutes,
        ) * crossLayout.snapMinutes,
      ),
    );

    return {
      dayIndex: column.index,
      startMinutes,
      type: "timed" as const,
    };
  }

  // Notifies React (sidebar state) which Someday column the drag is over, so
  // the drop zones can light up. Deduped to one call per category change to
  // avoid a setState every animation frame.
  function reportSidebarPreview(category: SomedayInteractionCategory | null) {
    if (category === lastReportedSidebarCategory) {
      return;
    }

    lastReportedSidebarCategory = category;
    runtime().onPreviewCalendarToSidebar?.(category ? { category } : null);
  }

  function resolveSidebarDrop(pointer: VisualPoint): WeekSidebarDrop | null {
    for (const target of somedayDropTargetRegistry.getTargets()) {
      const rect = target.element.getBoundingClientRect();

      if (!isPointInRect(pointer, rect)) {
        continue;
      }

      const events = somedayEventRegistry.getEvents(target.category);
      const insertionIndex = events.findIndex((event) => {
        const eventRect = event.element.getBoundingClientRect();

        return pointer.y < eventRect.top + eventRect.height / 2;
      });

      return {
        category: target.category,
        index: insertionIndex === -1 ? events.length : insertionIndex,
        type: "sidebar",
      };
    }

    return null;
  }

  function getAllDayCrossSurfaceOverlayRect(
    drop: { dayIndex: number },
    visual: WeekEdgeNavigableVisual,
  ) {
    const crossLayout = allDayLayout;
    const column = crossLayout?.dayColumns.find(
      (day) => day.index === drop.dayIndex,
    );

    if (!crossLayout || !column) {
      return {
        height: visual.sourceRect.height,
        left: visual.sourceRect.left,
        top: visual.sourceRect.top,
        width: visual.sourceRect.width,
      };
    }

    return {
      height: EVENT_ALLDAY_HEIGHT,
      left: column.left,
      top: crossLayout.edgeNavigation.top,
      width: visual.sourceRect.width,
    };
  }

  function getTimedCrossSurfaceOverlayRect(
    drop: { dayIndex: number; startMinutes: number },
    visual: WeekEdgeNavigableVisual,
  ) {
    const crossLayout = timedLayout;
    const column = crossLayout?.dayColumns.find(
      (day) => day.index === drop.dayIndex,
    );

    if (!crossLayout || !column) {
      return {
        height: visual.sourceRect.height,
        left: visual.sourceRect.left,
        top: visual.sourceRect.top,
        width: visual.sourceRect.width,
      };
    }

    const scrollTop = crossLayout.smartScroll?.element.scrollTop ?? 0;

    return {
      height:
        DEFAULT_CONVERTED_TIMED_DURATION_MINUTES * crossLayout.pixelsPerMinute,
      left: column.left + TIMED_EVENT_COLUMN_INSET,
      top:
        crossLayout.edgeNavigation.top +
        drop.startMinutes * crossLayout.pixelsPerMinute -
        scrollTop,
      width: Math.max(0, column.width - TIMED_EVENT_COLUMN_INSET * 2),
    };
  }

  function applyCrossSurfaceSnapTransition(node: HTMLElement) {
    node.style.transition = isReducedMotionPreferred()
      ? "none"
      : CROSS_SURFACE_SNAP_TRANSITION;
  }

  function applyShapeSnapTransition(node: HTMLElement) {
    node.style.transition = isReducedMotionPreferred()
      ? "none"
      : SHAPE_SNAP_TRANSITION;
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

const buildWeekLayoutCacheForTarget = (
  target: WeekInteractionTarget,
  sources: WeekLayoutCacheSources,
) =>
  isAllDayTarget(target)
    ? buildAllDayWeekLayoutCache(sources)
    : buildTimedWeekLayoutCache(sources);

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

const isPointInLayout = (point: VisualPoint, layout: WeekLayoutCache) =>
  point.x >= layout.edgeNavigation.left &&
  point.x <= layout.edgeNavigation.right &&
  point.y > layout.edgeNavigation.top &&
  point.y < layout.edgeNavigation.bottom;

const isPointInsideColumns = (
  point: VisualPoint,
  columns: WeekLayoutCache["dayColumns"],
) => {
  const firstColumn = columns[0];
  const lastColumn = columns[columns.length - 1];

  if (!firstColumn || !lastColumn) {
    return false;
  }

  return (
    point.x >= firstColumn.left && point.x <= lastColumn.left + lastColumn.width
  );
};

const isPointInRect = (
  point: VisualPoint,
  rect: Pick<DOMRect, "bottom" | "left" | "right" | "top">,
) =>
  point.x >= rect.left &&
  point.x <= rect.right &&
  point.y >= rect.top &&
  point.y <= rect.bottom;

const getVisualSidebarDrop = (
  visual: WeekInteractionVisual,
): WeekSidebarDrop | null =>
  "sidebarDrop" in visual
    ? ((visual as WeekSidebarDroppableVisual).sidebarDrop ?? null)
    : null;

const isReducedMotionPreferred = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
