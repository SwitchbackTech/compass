import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import { CalendarInteractionEngine } from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import {
  hasTimedDragVisualMoved,
  timedDragVisualToGridEvent,
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
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "./model/TimedDragVisual";
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
  onMotionActivation?: (target: WeekTimedDragTarget) => void;
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
}

const inertRuntime: WeekInteractionRuntime = {
  getTimedEventById: () => null,
  isEventPending: () => false,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

const EDGE_NAVIGATION_DWELL_MS = 500;

export class WeekInteractionAdapter {
  readonly #engine: CalendarInteractionEngine<
    WeekTimedDragTarget,
    TimedDragVisual,
    WeekTimedDragCommitResult
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
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved timed resize until the timed-resize cutover task.",
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

    if (!this.#getTimedDragTarget(event)) {
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
      reason: "saved-timed-drag",
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
    this.#engine.handlePointerMove(event);
  }

  handlePointerUp(event: PointerEvent) {
    this.#metrics.pointerUps += 1;
    const result = this.#engine.handlePointerUp(event);

    if (!result) {
      return;
    }

    if (result.type === "click") {
      this.#runtime().onClickTimedEvent(result.target.event);
      this.#setMotionActive(false);
      return;
    }

    this.#runtime().onCommitTimedDrag(result.result);
  }

  handlePointerCancel(event: PointerEvent) {
    this.#metrics.pointerCancels += 1;
    this.#engine.handlePointerCancel(event);
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
    WeekTimedDragTarget,
    TimedDragVisual,
    WeekTimedDragCommitResult
  > {
    return {
      cancel: () => {
        this.#clearTimedDragState();
        this.#setMotionActive(false);
      },
      commit: ({ target, visual }) => {
        const movedEvent = timedDragVisualToGridEvent(target.event, visual);
        const result: WeekTimedDragCommitResult = {
          event: movedEvent,
          eventId: target.event._id!,
          hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
          hasMoved: hasTimedDragVisualMoved(visual),
          type: "timedDragEnd",
        };

        this.#clearTimedDragState();
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

        return createTimedDragVisual({
          dayIndex: getLocalDayIndex(target.event.startDate),
          endMinutes: getLocalMinutes(target.event.endDate),
          eventId: target.event._id!,
          pointerStart,
          sourceRect,
          startMinutes: getLocalMinutes(target.event.startDate),
        });
      },
      getOverlayMount: ({ sourceElement }) =>
        createWeekInteractionEventOverlayMount({
          cursor: "move",
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getTarget: (event) => this.#getTimedDragTarget(event),
      updateVisual: ({ pointer, target, timestamp, visual }) => {
        this.#rebuildLayoutIfNeeded();

        if (!this.#layout || this.#scrollTop === null) {
          return {
            overlay: null,
            visual,
          };
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

  #clearTimedDragState() {
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
