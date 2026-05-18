import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import { CalendarInteractionEngine } from "@web/common/calendar-interaction/CalendarInteractionEngine";
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
import { setWeekInteractionMotionActive } from "./weekInteractionMotionState";

export type WeekInteractionAdapterMode = "active" | "passive";

export interface WeekInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

interface WeekInteractionAdapterOptions {
  engineOptions?: WeekInteractionEngineOptions;
  mode?: WeekInteractionAdapterMode;
  runtime?: () => WeekInteractionRuntime;
}

interface WeekInteractionEngineOptions {
  cancelFrame?: (frame: unknown) => void;
  clearTimer?: (timer: unknown) => void;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => unknown;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
}

interface WeekInteractionCancellationTargets {
  documentTarget?: Document;
  windowTarget?: Window;
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

export class WeekInteractionAdapter {
  readonly #engine: CalendarInteractionEngine<
    WeekInteractionTarget,
    WeekInteractionVisual,
    WeekInteractionCommitResult
  >;
  readonly #mode: WeekInteractionAdapterMode;
  readonly #runtime: () => WeekInteractionRuntime;
  #edgeNavigation: {
    enteredAt: number | null;
    requested: boolean;
    side: "next" | "prev" | null;
  } = { enteredAt: null, requested: false, side: null };
  #isLayoutRebuildPending = false;
  #layout: WeekLayoutCache | null = null;
  #scrollTop: number | null = null;

  constructor({
    engineOptions,
    mode = "passive",
    runtime = () => inertRuntime,
  }: WeekInteractionAdapterOptions = {}) {
    this.#mode = mode;
    this.#runtime = runtime;
    this.#engine = new CalendarInteractionEngine({
      adapter: this.#createEngineAdapter(),
      ...engineOptions,
    });
  }

  ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return this.#engine.ownsPointer(event);
  }

  connectCancellationEvents(targets?: WeekInteractionCancellationTargets) {
    return this.#engine.connectCancellationEvents(targets);
  }

  rebuildLayoutAfterNavigation() {
    const session = this.#engine.getSession();

    if (session.phase === "idle") {
      return;
    }

    this.#rebuildLayoutIfNeeded(session.target);
  }

  handlePointerDown(event: PointerEvent): WeekInteractionPointerOwnership {
    if (this.#mode === "passive") {
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

    const target = this.#getInteractionTarget(event);

    if (!target) {
      return {
        reason: "no-week-interaction-target",
        shouldOwn: false,
      };
    }

    if (!this.#engine.handlePointerDown(event)) {
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

  handlePointerMove(event: PointerEvent) {
    const ownsPointer = this.ownsPointer(event);

    this.#engine.handlePointerMove(event);

    return ownsPointer;
  }

  handlePointerUp(event: PointerEvent) {
    const ownsPointer = this.ownsPointer(event);
    const result = this.#engine.handlePointerUp(event);

    if (!result) {
      return ownsPointer;
    }

    if (result.type === "click") {
      const runtime = this.#runtime();

      if (isAllDayTarget(result.target)) {
        runtime.onClickAllDayEvent?.(result.target.event);
      } else {
        runtime.onClickTimedEvent(result.target.event);
      }
      setWeekInteractionMotionActive(false);
      return ownsPointer;
    }

    const runtime = this.#runtime();

    if (result.result.type === "allDayDragEnd") {
      runtime.onCommitAllDayDrag?.(result.result);
      return ownsPointer;
    }

    if (result.result.type === "allDayResizeEnd") {
      runtime.onCommitAllDayResize?.(result.result);
      return ownsPointer;
    }

    if (result.result.type === "timedDragEnd") {
      runtime.onCommitTimedDrag(result.result);
      return ownsPointer;
    }

    runtime.onCommitTimedResize?.(result.result);

    return ownsPointer;
  }

  handlePointerCancel(event: PointerEvent) {
    const ownsPointer = this.ownsPointer(event);

    this.#engine.handlePointerCancel(event);

    return ownsPointer;
  }

  #createEngineAdapter(): CalendarInteractionAdapter<
    WeekInteractionTarget,
    WeekInteractionVisual,
    WeekInteractionCommitResult
  > {
    return {
      cancel: () => {
        this.#clearInteractionState();
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

        this.#clearInteractionState();
        setWeekInteractionMotionActive(false);

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const layout = buildWeekLayoutCacheForTarget(target);

        if (!layout) {
          return null;
        }

        const sourceRect = readElementRect(sourceElement);
        this.#layout = layout;
        this.#scrollTop = layout.smartScroll?.initialScrollTop ?? null;
        this.#runtime().onMotionActivation?.(target);

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
      getTarget: (event) => this.#getInteractionTarget(event),
      updateVisual: ({ pointer, target, timestamp, visual }) => {
        this.#rebuildLayoutIfNeeded(target);

        if (!this.#layout || this.#scrollTop === null) {
          if (visual.type !== "allDayDrag" && visual.type !== "allDayResize") {
            return {
              overlay: null,
              visual,
            };
          }
        }

        if (!this.#layout) {
          return {
            overlay: null,
            visual,
          };
        }

        if (visual.type === "allDayDrag") {
          const edgeNavigation = this.#updateEdgeNavigation(
            visual,
            pointer,
            timestamp,
          );
          const nextVisual = updateAllDayDragVisual(edgeNavigation.visual, {
            layout: this.#layout,
            pointer,
          });

          return {
            overlay: {
              transform: nextVisual.transform,
            },
            shouldContinue: edgeNavigation.isDwellActive,
            visual: nextVisual,
          };
        }

        if (visual.type === "allDayResize") {
          const nextVisual = updateAllDayResizeVisual(visual, {
            layout: this.#layout,
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
            layout: this.#layout,
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

        const smartScroll = this.#applySmartScroll(pointer);
        const edgeNavigation = this.#updateEdgeNavigation(
          visual,
          pointer,
          timestamp,
        );
        const nextVisual = updateTimedDragVisual(edgeNavigation.visual, {
          layout: this.#layout,
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
            smartScroll.isScrolling || edgeNavigation.isDwellActive,
          visual: nextVisual,
        };
      },
    };
  }

  #getInteractionTarget(event: PointerEvent): WeekInteractionTarget | null {
    const allDayResizeTarget = this.#getAllDayResizeTarget(event);

    if (allDayResizeTarget) {
      return allDayResizeTarget;
    }

    const resizeTarget = this.#getTimedResizeTarget(event);

    if (resizeTarget) {
      return resizeTarget;
    }

    const timedDragTarget = this.#getTimedDragTarget(event);

    if (timedDragTarget) {
      return timedDragTarget;
    }

    return this.#getAllDayDragTarget(event);
  }

  #getAllDayDragTarget(event: PointerEvent): WeekAllDayDragTarget | null {
    if (this.#mode !== "active") {
      return null;
    }

    if (getResizeHandleEdge(event)) {
      return null;
    }

    const target = this.#resolveAllDayEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      ...target,
      type: "allDayDrag",
    };
  }

  #getAllDayResizeTarget(event: PointerEvent): WeekAllDayResizeTarget | null {
    if (this.#mode !== "active") {
      return null;
    }

    const edge = getResizeHandleEdge(event);

    if (!edge) {
      return null;
    }

    const target = this.#resolveAllDayEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      edge,
      ...target,
      type: "allDayResize",
    };
  }

  #getTimedDragTarget(event: PointerEvent): WeekTimedDragTarget | null {
    if (this.#mode !== "active") {
      return null;
    }

    if (getResizeHandleEdge(event)) {
      return null;
    }

    const target = this.#resolveTimedEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      ...target,
      type: "timedDrag",
    };
  }

  #getTimedResizeTarget(event: PointerEvent): WeekTimedResizeTarget | null {
    if (this.#mode !== "active") {
      return null;
    }

    const edge = getResizeHandleEdge(event);

    if (!edge) {
      return null;
    }

    const target = this.#resolveTimedEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      edge,
      ...target,
      type: "timedResize",
    };
  }

  #resolveAllDayEventTarget(
    event: PointerEvent,
  ): WeekResolvedEventTarget | null {
    const registered = this.#getRegisteredTarget(event, "all-day");

    if (!registered) {
      return null;
    }

    const runtime = this.#runtime();
    const allDayEvent = runtime.getAllDayEventById?.(registered.eventId);

    if (
      !allDayEvent?._id ||
      !allDayEvent.isAllDay ||
      runtime.isEventPending(allDayEvent._id)
    ) {
      return null;
    }

    return {
      event: allDayEvent,
      hadFormOpenBeforeInteraction: runtime.isFormOpen?.() ?? false,
      registered,
    };
  }

  #resolveTimedEventTarget(
    event: PointerEvent,
  ): WeekResolvedEventTarget | null {
    const registered = this.#getRegisteredTarget(event, "timed");

    if (!registered) {
      return null;
    }

    const runtime = this.#runtime();
    const timedEvent = runtime.getTimedEventById(registered.eventId);

    if (
      !timedEvent?._id ||
      timedEvent.isAllDay ||
      runtime.isEventPending(timedEvent._id)
    ) {
      return null;
    }

    return {
      event: timedEvent,
      hadFormOpenBeforeInteraction: runtime.isFormOpen?.() ?? false,
      registered,
    };
  }

  #getRegisteredTarget(
    event: PointerEvent,
    eventType: WeekInteractionEventType,
  ) {
    const registered = weekEventRegistry.resolveFromTarget(event.target);

    return registered?.eventType === eventType ? registered : null;
  }

  #applySmartScroll(pointer: VisualPoint) {
    if (!this.#layout?.smartScroll || this.#scrollTop === null) {
      return { isScrolling: false, scrollDeltaPx: 0 };
    }

    const frame = getSmartScrollFrame({
      cache: this.#layout.smartScroll,
      pointerY: pointer.y,
      scrollTop: this.#scrollTop,
    });

    if (frame.scrollTop !== this.#scrollTop) {
      this.#layout.smartScroll.element.scrollTop = frame.scrollTop;
      this.#scrollTop = frame.scrollTop;
    }

    return {
      isScrolling: frame.velocityPx !== 0,
      scrollDeltaPx:
        this.#scrollTop - this.#layout.smartScroll.initialScrollTop,
    };
  }

  #updateEdgeNavigation<TVisual extends WeekEdgeNavigableVisual>(
    visual: TVisual,
    pointer: VisualPoint,
    timestamp: number,
  ): { isDwellActive: boolean; visual: TVisual } {
    if (!this.#layout) {
      this.#resetEdgeNavigation();
      return { isDwellActive: false, visual };
    }

    const side = getEdgeNavigationSide(this.#layout.edgeNavigation, pointer);

    if (!side) {
      this.#resetEdgeNavigation();
      return { isDwellActive: false, visual };
    }

    if (this.#edgeNavigation.side !== side) {
      this.#edgeNavigation = {
        enteredAt: timestamp,
        requested: false,
        side,
      };

      return { isDwellActive: true, visual };
    }

    if (
      this.#edgeNavigation.enteredAt !== null &&
      !this.#edgeNavigation.requested &&
      timestamp - this.#edgeNavigation.enteredAt >= EDGE_NAVIGATION_DWELL_MS
    ) {
      this.#edgeNavigation.requested = true;
      this.#isLayoutRebuildPending = true;
      this.#runtime().onRequestWeekNavigation?.(side);

      return {
        isDwellActive: false,
        visual: {
          ...visual,
          weekOffsetDays: visual.weekOffsetDays + (side === "next" ? 7 : -7),
        } as TVisual,
      };
    }

    return {
      isDwellActive: !this.#edgeNavigation.requested,
      visual,
    };
  }

  #rebuildLayoutIfNeeded(target: WeekInteractionTarget) {
    if (!this.#isLayoutRebuildPending) {
      return;
    }

    const nextLayout = buildWeekLayoutCacheForTarget(target);

    if (!nextLayout) {
      return;
    }

    this.#layout = nextLayout;
    this.#scrollTop = nextLayout.smartScroll?.initialScrollTop ?? null;
    this.#isLayoutRebuildPending = false;
  }

  #resetEdgeNavigation() {
    this.#edgeNavigation = {
      enteredAt: null,
      requested: false,
      side: null,
    };
  }

  #clearInteractionState() {
    this.#layout = null;
    this.#scrollTop = null;
    this.#resetEdgeNavigation();
    this.#isLayoutRebuildPending = false;
  }
}

const isAllDayTarget = (
  target: WeekInteractionTarget,
): target is WeekAllDayDragTarget | WeekAllDayResizeTarget =>
  target.type === "allDayDrag" || target.type === "allDayResize";

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
