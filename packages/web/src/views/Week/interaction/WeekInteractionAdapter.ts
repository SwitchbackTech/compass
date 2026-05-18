import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import { CalendarInteractionEngine } from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import {
  hasTimedDragVisualMoved,
  hasTimedResizeVisualMoved,
  timedDragVisualToGridEvent,
  timedResizeVisualToGridEvent,
} from "./commit/timedDragVisualToGridEvent";
import { createWeekInteractionEventOverlayMount } from "./dom/cloneWeekInteractionEventElement";
import {
  type WeekInteractionRegisteredTarget,
  weekEventRegistry,
} from "./geometry/weekEventRegistry";
import {
  buildTimedWeekLayoutCache,
  type WeekEdgeNavigationCache,
  type WeekLayoutCache,
} from "./geometry/weekLayoutCache";
import { getSmartScrollFrame } from "./math/smartScroll";
import { createTimedDragVisual, updateTimedDragVisual } from "./math/timedDrag";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "./math/timedResize";
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
  createWeekInteractionRuntimeMetrics,
  type WeekInteractionRuntimeMetrics,
} from "./WeekInteractionMetrics";

export type WeekInteractionAdapterMode = "active" | "passive";

export type WeekInteractionOwnedSurface =
  | "savedTimedDrag"
  | "savedTimedResize"
  | "savedAllDayDrag"
  | "savedAllDayResize"
  | "pendingEvent"
  | "draftEvent"
  | "emptyGridSelection"
  | "emptyGridDraftCreation"
  | "somedaySidebarDrop"
  | "formUi";

export interface WeekInteractionOwnershipEntry {
  newOwner: "existing-week-path" | "week-interaction-adapter";
  notes: string;
  surface: WeekInteractionOwnedSurface;
}

export interface WeekInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

interface WeekInteractionAdapterOptions {
  engineOptions?: WeekInteractionEngineOptions;
  metrics?: WeekInteractionRuntimeMetrics;
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

export interface WeekInteractionRuntime {
  getTimedEventById(eventId: string): Schema_GridEvent | null;
  isEventPending: (eventId: string) => boolean;
  isFormOpen?: () => boolean;
  now?: () => number;
  onClickTimedEvent: (event: Schema_GridEvent) => void;
  onCommitTimedDrag: (result: WeekTimedDragCommitResult) => void;
  onCommitTimedResize?: (result: WeekTimedResizeCommitResult) => void;
  onMotionActivation?: (target: WeekTimedInteractionTarget) => void;
  onRequestWeekNavigation?: (direction: "next" | "prev") => void;
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

type WeekTimedInteractionTarget = WeekTimedDragTarget | WeekTimedResizeTarget;
type WeekTimedInteractionVisual = TimedDragVisual | TimedResizeVisual;
type WeekTimedInteractionCommitResult =
  | WeekTimedDragCommitResult
  | WeekTimedResizeCommitResult;

const inertRuntime: WeekInteractionRuntime = {
  getTimedEventById: () => null,
  isEventPending: () => false,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

const EDGE_NAVIGATION_DWELL_MS = 500;

export class WeekInteractionAdapter {
  readonly #engine: CalendarInteractionEngine<
    WeekTimedInteractionTarget,
    WeekTimedInteractionVisual,
    WeekTimedInteractionCommitResult
  >;
  readonly #metrics: WeekInteractionRuntimeMetrics;
  readonly #mode: WeekInteractionAdapterMode;
  readonly #runtime: () => WeekInteractionRuntime;
  #didRecordOwnedPointerDown = false;
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
    metrics = createWeekInteractionRuntimeMetrics(),
    mode = "passive",
    runtime = () => inertRuntime,
  }: WeekInteractionAdapterOptions = {}) {
    this.#metrics = metrics;
    this.#mode = mode;
    this.#runtime = runtime;
    this.#engine = new CalendarInteractionEngine({
      adapter: this.#createTimedDragEngineAdapter(),
      ...engineOptions,
    });
  }

  getMetrics() {
    return this.#metrics;
  }

  ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return this.#engine.ownsPointer(event);
  }

  getOwnershipMatrix(): WeekInteractionOwnershipEntry[] {
    return [
      {
        newOwner:
          this.#mode === "active"
            ? "week-interaction-adapter"
            : "existing-week-path",
        notes:
          this.#mode === "active"
            ? "Active adapter owns saved timed drag through the calendar interaction engine."
            : "Passive adapter refuses saved timed drag until the timed-drag cutover task.",
        surface: "savedTimedDrag",
      },
      {
        newOwner:
          this.#mode === "active"
            ? "week-interaction-adapter"
            : "existing-week-path",
        notes:
          this.#mode === "active"
            ? "Active adapter owns saved timed resize through the calendar interaction engine."
            : "Passive adapter refuses saved timed resize until the timed-resize cutover task.",
        surface: "savedTimedResize",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved all-day drag until the all-day drag cutover task.",
        surface: "savedAllDayDrag",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved all-day resize until the all-day resize cutover task.",
        surface: "savedAllDayResize",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Pending events remain non-owned by the adapter and follow the existing pending-event rule.",
        surface: "pendingEvent",
      },
      {
        newOwner: "existing-week-path",
        notes: "Draft events remain with the existing draft provider paths.",
        surface: "draftEvent",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Empty-grid selection remains outside the adapter in this branch phase.",
        surface: "emptyGridSelection",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Empty-grid draft creation remains with the current all-day and timed grid handlers.",
        surface: "emptyGridDraftCreation",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Someday/sidebar drag and drop remains with the planner sidebar DND paths.",
        surface: "somedaySidebarDrop",
      },
      {
        newOwner: "existing-week-path",
        notes: "Form UI remains owned by existing floating form paths.",
        surface: "formUi",
      },
    ];
  }

  handlePointerDown(event: PointerEvent): WeekInteractionPointerOwnership {
    this.#didRecordOwnedPointerDown = false;
    this.#metrics.pointerDowns += 1;

    if (this.#mode === "passive") {
      return {
        reason: "passive-week-adapter",
        shouldOwn: false,
      };
    }

    const target = this.#getTimedInteractionTarget(event);

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

    this.#setMotionActive(true);
    this.#recordOwnedPointerDown();

    return {
      reason:
        target.type === "timedDrag" ? "saved-timed-drag" : "saved-timed-resize",
      shouldOwn: true,
    };
  }

  getRegisteredTarget(
    event: PointerEvent,
  ): WeekInteractionRegisteredTarget | null {
    return weekEventRegistry.resolveFromTarget(event.target);
  }

  handlePointerMove(event: PointerEvent) {
    this.#metrics.pointerMoves += 1;
    const ownsPointer = this.ownsPointer(event);

    this.#engine.handlePointerMove(event);

    return ownsPointer;
  }

  handlePointerUp(event: PointerEvent) {
    this.#metrics.pointerUps += 1;
    const ownsPointer = this.ownsPointer(event);
    const result = this.#engine.handlePointerUp(event);

    if (!result) {
      return ownsPointer;
    }

    if (result.type === "click") {
      this.#runtime().onClickTimedEvent(result.target.event);
      this.#setMotionActive(false);
      return ownsPointer;
    }

    if (result.result.type === "timedDragEnd") {
      this.#runtime().onCommitTimedDrag(result.result);
      return ownsPointer;
    }

    this.#runtime().onCommitTimedResize?.(result.result);

    return ownsPointer;
  }

  handlePointerCancel(event: PointerEvent) {
    this.#metrics.pointerCancels += 1;
    const ownsPointer = this.ownsPointer(event);

    this.#engine.handlePointerCancel(event);

    return ownsPointer;
  }

  recordOwnedPointerDown() {
    if (this.#didRecordOwnedPointerDown) {
      this.#didRecordOwnedPointerDown = false;
      return;
    }

    this.#recordOwnedPointerDown();
  }

  #recordOwnedPointerDown() {
    this.#didRecordOwnedPointerDown = true;
    this.#metrics.ownedPointerDowns += 1;
  }

  #createTimedDragEngineAdapter(): CalendarInteractionAdapter<
    WeekTimedInteractionTarget,
    WeekTimedInteractionVisual,
    WeekTimedInteractionCommitResult
  > {
    return {
      cancel: () => {
        this.#clearTimedInteractionState();
        this.#setMotionActive(false);
      },
      commit: ({ target, visual }) => {
        if (visual.type === "timedResize" && target.type === "timedResize") {
          const resizedEvent = timedResizeVisualToGridEvent(
            target.event,
            visual,
          );
          const result: WeekTimedResizeCommitResult = {
            event: resizedEvent,
            eventId: target.event._id!,
            hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
            hasMoved: hasTimedResizeVisualMoved(visual),
            type: "timedResizeEnd",
          };

          this.#clearTimedInteractionState();
          this.#setMotionActive(false);

          return result;
        }

        if (visual.type !== "timedDrag" || target.type !== "timedDrag") {
          throw new Error("Mismatched Week timed interaction target");
        }

        const movedEvent = timedDragVisualToGridEvent(target.event, visual);
        const result: WeekTimedDragCommitResult = {
          event: movedEvent,
          eventId: target.event._id!,
          hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
          hasMoved: hasTimedDragVisualMoved(visual),
          type: "timedDragEnd",
        };

        this.#clearTimedInteractionState();
        this.#setMotionActive(false);

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const layout = buildTimedWeekLayoutCache();

        if (!layout) {
          return null;
        }

        const sourceRect = readElementRect(sourceElement);
        this.#layout = layout;
        this.#scrollTop = layout.smartScroll.initialScrollTop;
        this.#runtime().onMotionActivation?.(target);

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
          cursor: target.type === "timedResize" ? "row-resize" : "move",
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getTarget: (event) => this.#getTimedInteractionTarget(event),
      updateVisual: ({ pointer, target, timestamp, visual }) => {
        this.#rebuildLayoutIfNeeded();

        if (!this.#layout || this.#scrollTop === null) {
          return {
            overlay: null,
            visual,
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
          throw new Error("Mismatched Week timed interaction target");
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

  #getTimedInteractionTarget(
    event: PointerEvent,
  ): WeekTimedInteractionTarget | null {
    const resizeTarget = this.#getTimedResizeTarget(event);

    if (resizeTarget) {
      return resizeTarget;
    }

    return this.#getTimedDragTarget(event);
  }

  #getTimedDragTarget(event: PointerEvent): WeekTimedDragTarget | null {
    if (this.#mode !== "active") {
      return null;
    }

    const pointerTarget = event.target instanceof Element ? event.target : null;

    if (pointerTarget?.closest("[data-week-event-resize-handle]")) {
      return null;
    }

    const registered = weekEventRegistry.resolveFromTarget(event.target);

    if (!registered || registered.eventType !== "timed") {
      return null;
    }

    const timedEvent = this.#runtime().getTimedEventById(registered.eventId);

    if (
      !timedEvent?._id ||
      timedEvent.isAllDay ||
      this.#runtime().isEventPending(timedEvent._id)
    ) {
      return null;
    }

    return {
      event: timedEvent,
      hadFormOpenBeforeInteraction: this.#runtime().isFormOpen?.() ?? false,
      registered,
      type: "timedDrag",
    };
  }

  #getTimedResizeTarget(event: PointerEvent): WeekTimedResizeTarget | null {
    if (this.#mode !== "active") {
      return null;
    }

    const pointerTarget = event.target instanceof Element ? event.target : null;
    const handle = pointerTarget?.closest("[data-week-event-resize-handle]");
    const edge = handle?.getAttribute("data-week-event-resize-handle");

    if (edge !== "startDate" && edge !== "endDate") {
      return null;
    }

    const registered = weekEventRegistry.resolveFromTarget(event.target);

    if (!registered || registered.eventType !== "timed") {
      return null;
    }

    const timedEvent = this.#runtime().getTimedEventById(registered.eventId);

    if (
      !timedEvent?._id ||
      timedEvent.isAllDay ||
      this.#runtime().isEventPending(timedEvent._id)
    ) {
      return null;
    }

    return {
      edge,
      event: timedEvent,
      hadFormOpenBeforeInteraction: this.#runtime().isFormOpen?.() ?? false,
      registered,
      type: "timedResize",
    };
  }

  #applySmartScroll(pointer: VisualPoint) {
    if (!this.#layout || this.#scrollTop === null) {
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

  #updateEdgeNavigation(
    visual: TimedDragVisual,
    pointer: VisualPoint,
    timestamp: number,
  ): { isDwellActive: boolean; visual: TimedDragVisual } {
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
        },
      };
    }

    return {
      isDwellActive: !this.#edgeNavigation.requested,
      visual,
    };
  }

  #rebuildLayoutIfNeeded() {
    if (!this.#isLayoutRebuildPending) {
      return;
    }

    const nextLayout = buildTimedWeekLayoutCache();

    if (!nextLayout) {
      return;
    }

    this.#layout = nextLayout;
    this.#scrollTop = nextLayout.smartScroll.initialScrollTop;
    this.#isLayoutRebuildPending = false;
  }

  #resetEdgeNavigation() {
    this.#edgeNavigation = {
      enteredAt: null,
      requested: false,
      side: null,
    };
  }

  #clearTimedInteractionState() {
    this.#layout = null;
    this.#scrollTop = null;
    this.#resetEdgeNavigation();
    this.#isLayoutRebuildPending = false;
  }

  #setMotionActive(isActive: boolean) {
    if (typeof window === "undefined") {
      return;
    }

    (
      window as unknown as {
        __weekInteractionV2MotionActive?: boolean;
      }
    ).__weekInteractionV2MotionActive = isActive;
  }
}

export const createPassiveWeekInteractionAdapter = () =>
  new WeekInteractionAdapter({ mode: "passive" });

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
