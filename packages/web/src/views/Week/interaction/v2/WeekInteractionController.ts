import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import {
  GRID_TIME_STEP,
  TIMED_EVENT_DRAG_GLIDE_MS,
  WEEK_TIMED_VISIBLE_HOURS,
} from "@web/views/Week/layout.constants";
import {
  allDayDragVisualToGridEvent,
  hasAllDayDragVisualMoved,
} from "./commit/allDayDragVisualToGridEvent";
import {
  allDayResizeVisualToGridEvent,
  hasAllDayResizeVisualChanged,
} from "./commit/allDayResizeVisualToGridEvent";
import {
  hasTimedEventVisualChanged,
  visualDraftToGridEvent,
} from "./commit/visualDraftToGridEvent";
import { cloneGridEventNode } from "./dom/cloneGridEventNode";
import { DragOverlay } from "./dom/DragOverlay";
import {
  markSourcePlaceholder,
  restoreSourcePlaceholder,
  type SourcePlaceholder,
} from "./dom/placeholder";
import {
  getRegisteredWeekEvent,
  type RegisteredWeekEvent,
} from "./geometry/eventRegistry";
import {
  type WeekDayColumnCache,
  type WeekLayoutCache,
} from "./geometry/WeekLayoutCache";
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
import { type AllDayResizeVisual } from "./model/AllDayResizeVisual";
import {
  type TimedDragVisual,
  type VisualPoint,
} from "./model/TimedDragVisual";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "./model/TimedResizeVisual";
import {
  createWeekInteractionMetrics,
  type WeekInteractionMetrics,
} from "./WeekInteractionMetrics";
import {
  type ActiveAllDayDragSession,
  type ActiveAllDayResizeSession,
  type ActiveTimedDragSession,
  type ActiveTimedResizeSession,
  type PendingAllDayDragSession,
  type PendingAllDayResizeSession,
  type PendingTimedDragSession,
  type PendingTimedResizeSession,
  type TimedDragActivationReason,
  type WeekInteractionPointerUpResult,
  type WeekInteractionSession,
} from "./WeekInteractionSession";

const DEFAULT_HOLD_DELAY_MS = 750;
const DEFAULT_MOVE_THRESHOLD_PX = 25;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;
const SMART_SCROLL_EDGE_THRESHOLD_PX = 50;
const SMART_SCROLL_BOTTOM_INSET_PX = 100;
const SMART_SCROLL_SPEED_PX = 10;

type WeekInteractionControllerOptions = {
  clearTimer?: (timer: unknown) => void;
  cancelFrame?: (frame: unknown) => void;
  createOverlay?: () => DragOverlay;
  getFormEventId?: () => string | null;
  getRegisteredEvent?: (id: string) => RegisteredWeekEvent | null;
  holdDelayMs?: number;
  isEnabled?: boolean | (() => boolean);
  isFormOpen?: () => boolean;
  isPendingEvent?: (eventId: string) => boolean;
  moveThresholdPx?: number;
  now?: () => number;
  edgeNavigationDwellMs?: number;
  onRequestWeekNavigation?: (direction: "next" | "prev") => void;
  requestFrame?: (callback: FrameRequestCallback) => unknown;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  timedDragGlideMs?: number;
};

const defaultOptions = {
  cancelFrame: (frame: unknown) => {
    cancelAnimationFrame(frame as number);
  },
  clearTimer: (timer: unknown) => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
  createOverlay: () => new DragOverlay(),
  getFormEventId: () => null,
  getRegisteredEvent: getRegisteredWeekEvent,
  holdDelayMs: DEFAULT_HOLD_DELAY_MS,
  isEnabled: false,
  isFormOpen: () => false,
  isPendingEvent: () => false,
  moveThresholdPx: DEFAULT_MOVE_THRESHOLD_PX,
  now: () => performance.now(),
  edgeNavigationDwellMs: 500,
  onRequestWeekNavigation: () => undefined,
  requestFrame: (callback: FrameRequestCallback) =>
    requestAnimationFrame(callback),
  setTimer: (callback: () => void, delayMs: number) =>
    setTimeout(callback, delayMs),
  timedDragGlideMs: TIMED_EVENT_DRAG_GLIDE_MS,
};

export class WeekInteractionController {
  readonly #options: Required<WeekInteractionControllerOptions>;
  #activatedAt: number | null = null;
  #lastFrameAt: number | null = null;
  #layout: WeekLayoutCache | null = null;
  #latestPointer: VisualPoint | null = null;
  #mutationObserver: MutationObserver | null = null;
  #overlay: DragOverlay | null = null;
  #placeholder: SourcePlaceholder | null = null;
  #rafId: unknown = null;
  #scrollTop: number | null = null;
  #edgeNavigation: {
    enteredAt: number | null;
    requested: boolean;
    side: "next" | "prev" | null;
  } = { enteredAt: null, requested: false, side: null };
  #isLayoutRebuildPending = false;
  #session: WeekInteractionSession = { phase: "idle" };
  #visual:
    | AllDayDragVisual
    | AllDayResizeVisual
    | TimedDragVisual
    | TimedResizeVisual
    | null = null;

  constructor(options: WeekInteractionControllerOptions = {}) {
    this.#options = { ...defaultOptions, ...options };
  }

  canOwnPointerDown(event?: PointerEvent): boolean {
    if (!event) {
      return false;
    }

    return (
      this.#getEligibleAllDayResize(event) !== null ||
      this.#getEligibleTimedResize(event) !== null ||
      this.#getEligibleTimedDrag(event) !== null ||
      this.#getEligibleAllDayDrag(event) !== null
    );
  }

  handlePointerDown(event: PointerEvent): boolean {
    const allDayResize = this.#getEligibleAllDayResize(event);
    const resize = allDayResize ? null : this.#getEligibleTimedResize(event);
    const drag =
      allDayResize || resize ? null : this.#getEligibleTimedDrag(event);
    const allDay =
      allDayResize || resize || drag
        ? null
        : this.#getEligibleAllDayDrag(event);
    const eligible = allDayResize ?? resize ?? drag ?? allDay;

    if (!eligible) {
      return false;
    }

    this.#setMotionActive(true);
    const holdTimer = this.#options.setTimer(() => {
      this.#activatePendingSession("hold");
    }, this.#options.holdDelayMs);

    this.#resetMetrics("pending");
    const formOpenAtPointerDown = this.#options.isFormOpen();
    this.#session = {
      event: eligible.registered.event,
      eventId: eligible.registered.event._id!,
      ...(allDayResize
        ? { edge: allDayResize.edge, kind: "allDayResize" as const }
        : resize
          ? { edge: resize.edge, kind: "timedResize" as const }
          : allDay
            ? { kind: "allDayDrag" as const }
            : { kind: "timed" as const }),
      formEventIdAtPointerDown: formOpenAtPointerDown
        ? this.#options.getFormEventId()
        : null,
      formOpenAtPointerDown,
      holdTimer,
      phase: "pending",
      pointerId: event.pointerId,
      sourceElement: eligible.element,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: this.#options.now(),
    };

    return true;
  }

  handlePointerMove(event: PointerEvent) {
    if (this.#session.phase === "motion") {
      if (event.pointerId !== this.#session.pointerId) {
        return;
      }

      const metrics = getWeekInteractionMetrics();
      if (metrics) {
        metrics.pointerMoveCount += 1;
      }
      this.#latestPointer = { x: event.clientX, y: event.clientY };
      this.#scheduleFrame();
      return;
    }

    if (this.#session.phase !== "pending") {
      return;
    }

    if (event.pointerId !== this.#session.pointerId) {
      return;
    }

    if (
      !hasExceededMoveThreshold(
        event.clientX,
        event.clientY,
        this.#session.startX,
        this.#session.startY,
        this.#options.moveThresholdPx,
      )
    ) {
      return;
    }

    this.#clearPendingTimer(this.#session);
    this.#activatePendingSession("move");
  }

  handlePointerUp(event: PointerEvent): WeekInteractionPointerUpResult {
    if (this.#session.phase === "idle") {
      return null;
    }

    if (event.pointerId !== this.#session.pointerId) {
      return null;
    }

    if (this.#session.phase === "pending") {
      const eventId = this.#session.eventId;
      const registered = this.#options.getRegisteredEvent(eventId);
      const sourceEvent = registered?.event ?? this.#session.event;
      this.#clearPendingTimer(this.#session);
      this.#session = { phase: "idle" };
      this.#setMotionActive(false);

      return { event: sourceEvent, eventId, type: "click" };
    }

    const eventId = this.#session.eventId;
    const registered = this.#options.getRegisteredEvent(eventId);
    const sourceEvent = registered?.event ?? this.#session.event;
    const visual = this.#visual;
    const movedEvent = visual
      ? convertVisualToGridEvent(sourceEvent, visual)
      : null;
    const hasMoved = visual ? hasVisualChanged(visual) : false;
    const hadFormOpenBeforeInteraction = this.#session.formOpenAtPointerDown;
    const formEventIdAtPointerDown = this.#session.formEventIdAtPointerDown;
    const resultType =
      this.#session.kind === "allDayResize"
        ? "allDayResizeEnd"
        : this.#session.kind === "timedResize"
          ? "timedResizeEnd"
          : this.#session.kind === "allDayDrag"
            ? "allDayDragEnd"
            : "timedDragEnd";
    this.#teardownActiveSession();
    this.#session = { phase: "idle" };

    return movedEvent
      ? {
          event: movedEvent,
          eventId,
          formEventIdAtPointerDown,
          hadFormOpenBeforeInteraction,
          hasMoved,
          type: resultType,
        }
      : null;
  }

  getSession(): WeekInteractionSession {
    return this.#session;
  }

  isHandlingPointer(event: PointerEvent): boolean {
    return (
      this.#session.phase !== "idle" &&
      event.pointerId === this.#session.pointerId
    );
  }

  #activatePendingSession(activatedBy: TimedDragActivationReason) {
    if (this.#session.phase !== "pending") {
      return;
    }

    if (!this.#mountTimedDragOverlay(this.#session)) {
      this.#clearPendingTimer(this.#session);
      this.#session = { phase: "idle" };
      this.#setMotionActive(false);
      return;
    }

    const activeSession:
      | ActiveAllDayDragSession
      | ActiveAllDayResizeSession
      | ActiveTimedDragSession
      | ActiveTimedResizeSession = {
      activatedBy,
      event: this.#session.event,
      eventId: this.#session.eventId,
      ...(this.#session.kind === "allDayResize"
        ? { edge: this.#session.edge, kind: "allDayResize" as const }
        : this.#session.kind === "timedResize"
          ? { edge: this.#session.edge, kind: "timedResize" as const }
          : this.#session.kind === "allDayDrag"
            ? { kind: "allDayDrag" as const }
            : { kind: "timed" as const }),
      formEventIdAtPointerDown: this.#session.formEventIdAtPointerDown,
      formOpenAtPointerDown: this.#session.formOpenAtPointerDown,
      phase: "motion",
      pointerId: this.#session.pointerId,
      sourceElement: this.#session.sourceElement,
      startX: this.#session.startX,
      startY: this.#session.startY,
      startedAt: this.#session.startedAt,
    };

    this.#session = activeSession;
    const metrics = getWeekInteractionMetrics();
    if (metrics) {
      metrics.active = true;
    }
    this.#latestPointer = {
      x: this.#session.startX,
      y: this.#session.startY,
    };
    this.#scheduleFrame();
  }

  #clearPendingTimer(
    session:
      | PendingAllDayDragSession
      | PendingAllDayResizeSession
      | PendingTimedDragSession
      | PendingTimedResizeSession,
  ) {
    this.#options.clearTimer(session.holdTimer);
  }

  #getEligibleTimedResize(event: PointerEvent) {
    if (!this.#isEnabled()) {
      return null;
    }

    const target = event.target instanceof Element ? event.target : null;
    const handle =
      target?.closest<HTMLElement>("[data-week-event-resize-handle]") ?? null;
    const element =
      target?.closest<HTMLElement>("[data-week-event-role='event']") ?? null;

    if (!target || !handle || !element) {
      return null;
    }

    const edge = handle.dataset.weekEventResizeHandle as
      | TimedResizeEdge
      | undefined;
    const eventId = element.dataset.weekEventId;
    const eventKind = element.dataset.weekEventKind;

    if (
      !eventId ||
      eventKind !== "timed" ||
      (edge !== "startDate" && edge !== "endDate")
    ) {
      return null;
    }

    const registered = this.#options.getRegisteredEvent(eventId);

    if (
      !registered ||
      registered.kind !== "timed" ||
      registered.event.isAllDay ||
      this.#options.isPendingEvent(eventId) ||
      isEdgeNavigationCandidate(registered.event) ||
      isSmartScrollCandidate(element)
    ) {
      return null;
    }

    return { edge, element, registered };
  }

  #getEligibleAllDayResize(event: PointerEvent) {
    if (!this.#isEnabled()) {
      return null;
    }

    const target = event.target instanceof Element ? event.target : null;
    const handle =
      target?.closest<HTMLElement>("[data-week-event-resize-handle]") ?? null;
    const element =
      target?.closest<HTMLElement>("[data-week-event-role='event']") ?? null;

    if (!target || !handle || !element) {
      return null;
    }

    const edge = handle.dataset.weekEventResizeHandle as
      | "startDate"
      | "endDate"
      | undefined;
    const eventId = element.dataset.weekEventId;
    const eventKind = element.dataset.weekEventKind;

    if (
      !eventId ||
      eventKind !== "allDay" ||
      (edge !== "startDate" && edge !== "endDate")
    ) {
      return null;
    }

    const registered = this.#options.getRegisteredEvent(eventId);

    if (
      !registered ||
      registered.kind !== "allDay" ||
      !registered.event.isAllDay ||
      this.#options.isPendingEvent(eventId) ||
      isAllDayEdgeNavigationCandidate(registered.event)
    ) {
      return null;
    }

    return { edge, element, registered };
  }

  #getEligibleTimedDrag(event: PointerEvent) {
    if (!this.#isEnabled()) {
      return null;
    }

    const target = event.target instanceof Element ? event.target : null;
    const element =
      target?.closest<HTMLElement>("[data-week-event-role='event']") ?? null;

    if (!target || !element) {
      return null;
    }

    if (target.closest("[data-week-event-resize-handle]")) {
      return null;
    }

    const eventId = element.dataset.weekEventId;
    const eventKind = element.dataset.weekEventKind;

    if (!eventId || eventKind !== "timed") {
      return null;
    }

    const registered = this.#options.getRegisteredEvent(eventId);

    if (
      !registered ||
      registered.kind !== "timed" ||
      registered.event.isAllDay ||
      this.#options.isPendingEvent(eventId)
    ) {
      return null;
    }

    return { element, registered };
  }

  #getEligibleAllDayDrag(event: PointerEvent) {
    if (!this.#isEnabled()) {
      return null;
    }

    const target = event.target instanceof Element ? event.target : null;
    const element =
      target?.closest<HTMLElement>("[data-week-event-role='event']") ?? null;

    if (!target || !element) {
      return null;
    }

    if (target.closest("[data-week-event-resize-handle]")) {
      return null;
    }

    const eventId = element.dataset.weekEventId;
    const eventKind = element.dataset.weekEventKind;

    if (!eventId || eventKind !== "allDay") {
      return null;
    }

    const registered = this.#options.getRegisteredEvent(eventId);

    if (
      !registered ||
      registered.kind !== "allDay" ||
      !registered.event.isAllDay ||
      this.#options.isPendingEvent(eventId)
    ) {
      return null;
    }

    return { element, registered };
  }

  #isEnabled() {
    const { isEnabled } = this.#options;

    return typeof isEnabled === "function" ? isEnabled() : isEnabled;
  }

  #mountTimedDragOverlay(
    session:
      | PendingAllDayDragSession
      | PendingAllDayResizeSession
      | PendingTimedDragSession
      | PendingTimedResizeSession,
  ) {
    const registered = this.#options.getRegisteredEvent(session.eventId);

    if (!registered) {
      return false;
    }

    const sourceClientRect = readElementRect(session.sourceElement);
    const layout = buildLayoutForSession(session);

    if (!layout) {
      return false;
    }

    const overlayMountStart = this.#options.now();
    const clone = cloneGridEventNode(session.sourceElement);
    const overlay = this.#options.createOverlay();
    overlay.mount({
      clone,
      cursor:
        session.kind === "timed" || session.kind === "allDayDrag"
          ? "move"
          : undefined,
      rect: {
        height: sourceClientRect.height,
        left: sourceClientRect.left + window.scrollX,
        top: sourceClientRect.top + window.scrollY,
        width: sourceClientRect.width,
      },
      transformTransitionMs:
        session.kind === "timed" ? this.#options.timedDragGlideMs : undefined,
    });
    this.#placeholder = markSourcePlaceholder(session.sourceElement);
    this.#overlay = overlay;
    this.#layout = layout;
    this.#scrollTop = layout.smartScroll?.initialScrollTop ?? null;
    const visualInput = {
      dayIndex: getLocalDayIndex(registered.event.startDate),
      endDayIndex: getAllDayInclusiveEndDayIndex(registered.event),
      endMinutes: getLocalMinutes(registered.event.endDate),
      eventId: session.eventId,
      pointerStart: { x: session.startX, y: session.startY },
      sourceRect: sourceClientRect,
      startDayIndex: getLocalDayIndex(registered.event.startDate),
      startMinutes: getLocalMinutes(registered.event.startDate),
    };
    this.#visual =
      session.kind === "timedResize"
        ? createTimedResizeVisual({ ...visualInput, edge: session.edge })
        : session.kind === "allDayResize"
          ? createAllDayResizeVisual({ ...visualInput, edge: session.edge })
          : session.kind === "allDayDrag"
            ? createAllDayDragVisual(visualInput)
            : createTimedDragVisual(visualInput);
    this.#activatedAt = this.#options.now();
    this.#startMutationObserver();

    const metrics = getWeekInteractionMetrics();
    if (metrics) {
      metrics.overlayMountMs = this.#options.now() - overlayMountStart;
    }

    return true;
  }

  #scheduleFrame() {
    if (this.#rafId !== null) {
      return;
    }

    this.#rafId = this.#options.requestFrame((timestamp) => {
      this.#rafId = null;
      this.#runFrame(timestamp);
    });
  }

  #runFrame(timestamp: number) {
    if (
      this.#session.phase !== "motion" ||
      !this.#latestPointer ||
      !this.#layout ||
      !this.#overlay ||
      !this.#visual
    ) {
      return;
    }

    const metrics = getWeekInteractionMetrics();
    const frameStart = this.#options.now();
    if (metrics && metrics.phase !== "motion") {
      metrics.phase = "motion";
    }
    this.#rebuildLayoutIfNeeded();
    if (metrics && this.#lastFrameAt !== null) {
      metrics.frameGaps.push(timestamp - this.#lastFrameAt);
    }
    this.#lastFrameAt = timestamp;

    const smartScroll =
      this.#visual.type === "timedDrag"
        ? this.#applySmartScroll()
        : { isScrolling: false, scrollDeltaPx: 0 };
    const isEdgeDwellActive = this.#updateEdgeNavigation(timestamp);

    if (this.#visual.type === "allDayDrag") {
      this.#visual = updateAllDayDragVisual(this.#visual, {
        layout: this.#layout,
        pointer: this.#latestPointer,
      });
      this.#overlay.updateTransform(this.#visual.transform);
    } else if (this.#visual.type === "allDayResize") {
      this.#visual = updateAllDayResizeVisual(this.#visual, {
        layout: this.#layout,
        pointer: this.#latestPointer,
      });
      this.#overlay.updateResize({
        height: this.#visual.sourceRect.height,
        transform: this.#visual.transform,
        width: this.#visual.width,
      });
    } else if (this.#visual.type === "timedResize") {
      this.#visual = updateTimedResizeVisual(this.#visual, {
        layout: this.#layout,
        pointer: this.#latestPointer,
      });
      this.#overlay.updateResize({
        height: this.#visual.durationMinutes * this.#layout.pixelsPerMinute,
        transform: this.#visual.transform,
      });
    } else {
      const previousDayIndex = this.#visual.dayIndex;
      this.#visual = updateTimedDragVisual(this.#visual, {
        layout: this.#layout,
        pointer: this.#latestPointer,
        scrollDeltaPx: smartScroll.scrollDeltaPx,
      });
      this.#overlay.updateTransform(this.#visual.transform, {
        shouldGlide: this.#visual.dayIndex !== previousDayIndex,
      });
      this.#updateTimedDragOverlayTimeLabel(this.#session.event, this.#visual);
    }

    if (metrics) {
      metrics.rafCount += 1;
      metrics.rafDurations.push(this.#options.now() - frameStart);
      metrics.styleWritesDuringMotion += 1;
      if (metrics.firstFrameLatencyMs === null && this.#activatedAt !== null) {
        metrics.firstFrameLatencyMs = this.#options.now() - this.#activatedAt;
      }
    }

    if (smartScroll.isScrolling || isEdgeDwellActive) {
      this.#scheduleFrame();
    }
  }

  #rebuildLayoutIfNeeded() {
    if (!this.#isLayoutRebuildPending || this.#session.phase !== "motion") {
      return;
    }

    const nextLayout = buildLayoutForSession(this.#session);

    if (!nextLayout) {
      return;
    }

    this.#layout = nextLayout;
    this.#scrollTop = nextLayout.smartScroll?.initialScrollTop ?? null;
    this.#isLayoutRebuildPending = false;
  }

  #updateTimedDragOverlayTimeLabel(
    event: Schema_GridEvent,
    visual: TimedDragVisual,
  ) {
    const movedEvent = visualDraftToGridEvent(event, visual);

    this.#overlay?.updateTimeLabel(
      getTimesLabel(movedEvent.startDate, movedEvent.endDate),
    );
  }

  #updateEdgeNavigation(timestamp: number) {
    if (
      !this.#layout?.edgeNavigation ||
      !this.#latestPointer ||
      (this.#visual?.type !== "timedDrag" &&
        this.#visual?.type !== "allDayDrag")
    ) {
      this.#resetEdgeNavigation();
      return false;
    }

    const side = getEdgeNavigationSide(
      this.#layout.edgeNavigation,
      this.#latestPointer,
    );

    if (!side) {
      this.#resetEdgeNavigation();
      return false;
    }

    if (this.#edgeNavigation.side !== side) {
      this.#edgeNavigation = {
        enteredAt: timestamp,
        requested: false,
        side,
      };
      return true;
    }

    if (
      this.#edgeNavigation.enteredAt !== null &&
      !this.#edgeNavigation.requested &&
      timestamp - this.#edgeNavigation.enteredAt >=
        this.#options.edgeNavigationDwellMs
    ) {
      this.#edgeNavigation.requested = true;
      this.#visual = applyWeekOffset(this.#visual, side);
      this.#isLayoutRebuildPending = true;
      this.#options.onRequestWeekNavigation(side);
    }

    return !this.#edgeNavigation.requested;
  }

  #resetEdgeNavigation() {
    this.#edgeNavigation = {
      enteredAt: null,
      requested: false,
      side: null,
    };
  }

  #applySmartScroll() {
    if (
      !this.#layout?.smartScroll ||
      !this.#latestPointer ||
      this.#scrollTop === null
    ) {
      return { isScrolling: false, scrollDeltaPx: 0 };
    }

    const frame = getSmartScrollFrame({
      cache: this.#layout.smartScroll,
      pointerY: this.#latestPointer.y,
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

  #teardownActiveSession() {
    if (this.#rafId !== null) {
      this.#options.cancelFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#overlay?.unmount();
    this.#overlay = null;
    if (this.#placeholder) {
      restoreSourcePlaceholder(this.#placeholder);
      this.#placeholder = null;
    }
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#layout = null;
    this.#latestPointer = null;
    this.#scrollTop = null;
    this.#resetEdgeNavigation();
    this.#isLayoutRebuildPending = false;
    this.#visual = null;
    this.#activatedAt = null;
    this.#lastFrameAt = null;

    const metrics = getWeekInteractionMetrics();
    if (metrics) {
      metrics.active = false;
      metrics.phase = "commit";
    }
    this.#setMotionActive(false);
  }

  #setMotionActive(isActive: boolean) {
    if (typeof window !== "undefined") {
      window.__weekInteractionV2MotionActive = isActive;
    }
  }

  #resetMetrics(phase: WeekInteractionMetrics["phase"]) {
    if (typeof window === "undefined") {
      return;
    }

    window.__weekInteractionMetrics = createWeekInteractionMetrics();
    window.__weekInteractionMetrics.phase = phase;
  }

  #startMutationObserver() {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver((records) => {
      const metrics = getWeekInteractionMetrics();
      if (!metrics || metrics.phase !== "motion") {
        return;
      }

      metrics.domMutationsDuringMotion += records.length;
      for (const record of records) {
        const target =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;
        if (target?.closest("[data-week-interaction-overlay='true']")) {
          continue;
        }

        metrics.unexpectedDomMutationsDuringMotion.push(
          describeMutationTarget(target),
        );
      }
    });
    this.#mutationObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
}

const hasExceededMoveThreshold = (
  currentX: number,
  currentY: number,
  initialX: number,
  initialY: number,
  threshold: number,
) => {
  const deltaX = Math.abs(currentX - initialX);
  const deltaY = Math.abs(currentY - initialY);

  return deltaX > threshold || deltaY > threshold;
};

const getWeekInteractionMetrics = () =>
  typeof window === "undefined" ? undefined : window.__weekInteractionMetrics;

const readElementRect = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};

const buildWeekLayoutCache = (): WeekLayoutCache | null => {
  const mainGrid = document.getElementById(ID_GRID_MAIN);

  if (!mainGrid) {
    return null;
  }

  const rect = mainGrid.getBoundingClientRect();
  const columnsRect = getTimedColumnsRect() ?? rect;
  const columnWidth = columnsRect.width / 7;
  const dayColumns: WeekDayColumnCache[] = Array.from(
    { length: 7 },
    (_, index) => ({
      index,
      left: columnsRect.left + columnWidth * index,
      width: columnWidth,
    }),
  );

  return {
    dayColumns,
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx: SMART_SCROLL_EDGE_THRESHOLD_PX,
      left: columnsRect.left,
      right: columnsRect.right,
      top: rect.top,
    },
    pixelsPerMinute: rect.height / (WEEK_TIMED_VISIBLE_HOURS * 60),
    snapMinutes: GRID_TIME_STEP,
    smartScroll: {
      bottom: rect.bottom - SMART_SCROLL_BOTTOM_INSET_PX,
      edgeThresholdPx: SMART_SCROLL_EDGE_THRESHOLD_PX,
      element: mainGrid,
      initialScrollTop: mainGrid.scrollTop,
      maxScrollTop: Math.max(0, mainGrid.scrollHeight - mainGrid.clientHeight),
      speedPx: SMART_SCROLL_SPEED_PX,
      top: rect.top,
    },
  };
};

const getTimedColumnsRect = () => {
  const columns = document.getElementById(ID_GRID_COLUMNS_TIMED);
  const rect = columns?.getBoundingClientRect();

  return rect && rect.width > 0 ? rect : null;
};

const buildAllDayLayoutCache = (): WeekLayoutCache | null => {
  const allDayColumns = document.getElementById(ID_ALLDAY_COLUMNS);

  if (!allDayColumns) {
    return null;
  }

  const rect = allDayColumns.getBoundingClientRect();
  const columnWidth = rect.width / 7;
  const dayColumns: WeekDayColumnCache[] = Array.from(
    { length: 7 },
    (_, index) => ({
      index,
      left: rect.left + columnWidth * index,
      width: columnWidth,
    }),
  );

  return {
    dayColumns,
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx: SMART_SCROLL_EDGE_THRESHOLD_PX,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    },
    pixelsPerMinute: 1,
    snapMinutes: GRID_TIME_STEP,
  };
};

const buildLayoutForSession = (
  session:
    | ActiveAllDayDragSession
    | ActiveAllDayResizeSession
    | ActiveTimedDragSession
    | ActiveTimedResizeSession
    | PendingAllDayDragSession
    | PendingAllDayResizeSession
    | PendingTimedDragSession
    | PendingTimedResizeSession,
) =>
  session.kind === "allDayDrag" || session.kind === "allDayResize"
    ? buildAllDayLayoutCache()
    : buildWeekLayoutCache();

const convertVisualToGridEvent = (
  event: Schema_GridEvent,
  visual:
    | AllDayDragVisual
    | AllDayResizeVisual
    | TimedDragVisual
    | TimedResizeVisual,
) =>
  visual.type === "allDayDrag"
    ? allDayDragVisualToGridEvent(event, visual)
    : visual.type === "allDayResize"
      ? allDayResizeVisualToGridEvent(event, visual)
      : visualDraftToGridEvent(event, visual);

const hasVisualChanged = (
  visual:
    | AllDayDragVisual
    | AllDayResizeVisual
    | TimedDragVisual
    | TimedResizeVisual,
) =>
  visual.type === "allDayDrag"
    ? hasAllDayDragVisualMoved(visual)
    : visual.type === "allDayResize"
      ? hasAllDayResizeVisualChanged(visual)
      : hasTimedEventVisualChanged(visual);

const getEdgeNavigationSide = (
  edgeNavigation: NonNullable<WeekLayoutCache["edgeNavigation"]>,
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

const applyWeekOffset = (
  visual: AllDayDragVisual | TimedDragVisual,
  side: "next" | "prev",
) => ({
  ...visual,
  weekOffsetDays: visual.weekOffsetDays + (side === "next" ? 7 : -7),
});

const getLocalMinutes = (dateString: string | undefined) => {
  const date = new Date(dateString ?? 0);

  return date.getHours() * 60 + date.getMinutes();
};

const getLocalDayIndex = (dateString: string | undefined) =>
  getLocalDate(dateString).getDay();

const getAllDayInclusiveEndDayIndex = (event: Schema_GridEvent) => {
  const startDate = getLocalStartOfDay(event.startDate);
  const endDate = getLocalStartOfDay(event.endDate);
  const durationDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY),
  );

  return Math.min(6, getLocalDayIndex(event.startDate) + durationDays - 1);
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

const getLocalStartOfDay = (dateString: string | undefined) => {
  const date = getLocalDate(dateString);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const isEdgeNavigationCandidate = (event: Schema_GridEvent) => {
  const dayIndex = getLocalDayIndex(event.startDate);

  return dayIndex === 0 || dayIndex === 6;
};

const isAllDayEdgeNavigationCandidate = (event: Schema_GridEvent) => {
  const startDayIndex = getLocalDayIndex(event.startDate);
  const endDayIndex = getAllDayInclusiveEndDayIndex(event);

  return startDayIndex === 0 || endDayIndex === 6;
};

const isSmartScrollCandidate = (sourceElement: HTMLElement) => {
  const mainGrid = document.getElementById(ID_GRID_MAIN);

  if (!mainGrid) {
    return false;
  }

  const gridRect = mainGrid.getBoundingClientRect();
  const sourceRect = sourceElement.getBoundingClientRect();
  const sourceBottom = sourceRect.bottom || sourceRect.top + sourceRect.height;
  const gridBottom = gridRect.bottom || gridRect.top + gridRect.height;

  return (
    sourceRect.top < gridRect.top + SMART_SCROLL_EDGE_THRESHOLD_PX ||
    sourceBottom > gridBottom - SMART_SCROLL_EDGE_THRESHOLD_PX
  );
};

const describeMutationTarget = (target: Element | null) => {
  if (!target) {
    return "unknown";
  }

  const id = target.id ? `#${target.id}` : "";
  const role = target.getAttribute("role");
  const roleLabel = role ? `[role="${role}"]` : "";

  return `${target.tagName.toLowerCase()}${id}${roleLabel}`;
};
