import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { GRID_TIME_STEP } from "@web/views/Week/layout.constants";
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
import { createTimedDragVisual, updateTimedDragVisual } from "./math/timedDrag";
import {
  type TimedDragVisual,
  type VisualPoint,
} from "./model/TimedDragVisual";
import {
  createWeekInteractionMetrics,
  type WeekInteractionMetrics,
} from "./WeekInteractionMetrics";
import {
  type ActiveTimedDragSession,
  type PendingTimedDragSession,
  type TimedDragActivationReason,
  type WeekInteractionPointerUpResult,
  type WeekInteractionSession,
} from "./WeekInteractionSession";

const DEFAULT_HOLD_DELAY_MS = 750;
const DEFAULT_MOVE_THRESHOLD_PX = 25;

type WeekInteractionControllerOptions = {
  clearTimer?: (timer: unknown) => void;
  cancelFrame?: (frame: unknown) => void;
  createOverlay?: () => DragOverlay;
  getRegisteredEvent?: (id: string) => RegisteredWeekEvent | null;
  holdDelayMs?: number;
  isEnabled?: boolean | (() => boolean);
  isFormOpen?: () => boolean;
  isPendingEvent?: (eventId: string) => boolean;
  moveThresholdPx?: number;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => unknown;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
};

const defaultOptions = {
  cancelFrame: (frame: unknown) => {
    cancelAnimationFrame(frame as number);
  },
  clearTimer: (timer: unknown) => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
  createOverlay: () => new DragOverlay(),
  getRegisteredEvent: getRegisteredWeekEvent,
  holdDelayMs: DEFAULT_HOLD_DELAY_MS,
  isEnabled: false,
  isFormOpen: () => false,
  isPendingEvent: () => false,
  moveThresholdPx: DEFAULT_MOVE_THRESHOLD_PX,
  now: () => performance.now(),
  requestFrame: (callback: FrameRequestCallback) =>
    requestAnimationFrame(callback),
  setTimer: (callback: () => void, delayMs: number) =>
    setTimeout(callback, delayMs),
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
  #session: WeekInteractionSession = { phase: "idle" };
  #visual: TimedDragVisual | null = null;

  constructor(options: WeekInteractionControllerOptions = {}) {
    this.#options = { ...defaultOptions, ...options };
  }

  canOwnPointerDown(event?: PointerEvent): boolean {
    if (!event) {
      return false;
    }

    return this.#getEligibleTimedDrag(event) !== null;
  }

  handlePointerDown(event: PointerEvent): boolean {
    const eligible = this.#getEligibleTimedDrag(event);

    if (!eligible) {
      return false;
    }

    const holdTimer = this.#options.setTimer(() => {
      this.#activatePendingSession("hold");
    }, this.#options.holdDelayMs);

    this.#resetMetrics("pending");
    this.#session = {
      eventId: eligible.registered.event._id!,
      holdTimer,
      kind: "timed",
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
      this.#clearPendingTimer(this.#session);
      this.#session = { phase: "idle" };

      return { eventId, type: "click" };
    }

    const eventId = this.#session.eventId;
    this.#teardownActiveSession();
    this.#session = { phase: "idle" };

    return { eventId, type: "timedDragEnd" };
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
      return;
    }

    const activeSession: ActiveTimedDragSession = {
      activatedBy,
      eventId: this.#session.eventId,
      kind: this.#session.kind,
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
      metrics.phase = "motion";
    }
    this.#latestPointer = {
      x: this.#session.startX,
      y: this.#session.startY,
    };
    this.#scheduleFrame();
  }

  #clearPendingTimer(session: PendingTimedDragSession) {
    this.#options.clearTimer(session.holdTimer);
  }

  #getEligibleTimedDrag(event: PointerEvent) {
    if (!this.#isEnabled() || this.#options.isFormOpen()) {
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
      isRecurringEvent(registered.event) ||
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

  #mountTimedDragOverlay(session: PendingTimedDragSession) {
    const registered = this.#options.getRegisteredEvent(session.eventId);

    if (!registered) {
      return false;
    }

    const sourceClientRect = readElementRect(session.sourceElement);
    const layout = buildWeekLayoutCache();

    if (!layout) {
      return false;
    }

    const overlayMountStart = this.#options.now();
    const clone = cloneGridEventNode(session.sourceElement);
    const overlay = this.#options.createOverlay();
    overlay.mount({
      clone,
      rect: {
        height: sourceClientRect.height,
        left: sourceClientRect.left + window.scrollX,
        top: sourceClientRect.top + window.scrollY,
        width: sourceClientRect.width,
      },
    });
    this.#placeholder = markSourcePlaceholder(session.sourceElement);
    this.#overlay = overlay;
    this.#layout = layout;
    this.#visual = createTimedDragVisual({
      dayIndex: getLocalDayIndex(registered.event.startDate),
      endMinutes: getLocalMinutes(registered.event.endDate),
      eventId: session.eventId,
      pointerStart: { x: session.startX, y: session.startY },
      sourceRect: sourceClientRect,
      startMinutes: getLocalMinutes(registered.event.startDate),
    });
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
    if (metrics && this.#lastFrameAt !== null) {
      metrics.frameGaps.push(timestamp - this.#lastFrameAt);
    }
    this.#lastFrameAt = timestamp;

    this.#visual = updateTimedDragVisual(this.#visual, {
      layout: this.#layout,
      pointer: this.#latestPointer,
    });
    this.#overlay.updateTransform(this.#visual.transform);

    if (metrics) {
      metrics.rafCount += 1;
      metrics.rafDurations.push(this.#options.now() - frameStart);
      metrics.styleWritesDuringMotion += 1;
      if (metrics.firstFrameLatencyMs === null && this.#activatedAt !== null) {
        metrics.firstFrameLatencyMs = this.#options.now() - this.#activatedAt;
      }
    }
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
    this.#visual = null;
    this.#activatedAt = null;
    this.#lastFrameAt = null;

    const metrics = getWeekInteractionMetrics();
    if (metrics) {
      metrics.active = false;
      metrics.phase = "commit";
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

const isRecurringEvent = (event: Schema_GridEvent) => {
  const recurrence = event.recurrence;

  if (!recurrence) {
    return false;
  }

  return (
    typeof recurrence.eventId === "string" ||
    (Array.isArray(recurrence.rule) && recurrence.rule.length > 0)
  );
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
    pixelsPerMinute: rect.height / (11 * 60),
    snapMinutes: GRID_TIME_STEP,
  };
};

const getLocalMinutes = (dateString: string | undefined) => {
  const date = new Date(dateString ?? 0);

  return date.getHours() * 60 + date.getMinutes();
};

const getLocalDayIndex = (dateString: string | undefined) =>
  new Date(dateString ?? 0).getDay();

const describeMutationTarget = (target: Element | null) => {
  if (!target) {
    return "unknown";
  }

  const id = target.id ? `#${target.id}` : "";
  const role = target.getAttribute("role");
  const roleLabel = role ? `[role="${role}"]` : "";

  return `${target.tagName.toLowerCase()}${id}${roleLabel}`;
};
