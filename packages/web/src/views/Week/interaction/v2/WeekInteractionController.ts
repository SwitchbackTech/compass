import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  getRegisteredWeekEvent,
  type RegisteredWeekEvent,
} from "./geometry/eventRegistry";
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
  getRegisteredEvent?: (id: string) => RegisteredWeekEvent | null;
  holdDelayMs?: number;
  isEnabled?: boolean;
  isFormOpen?: () => boolean;
  isPendingEvent?: (eventId: string) => boolean;
  moveThresholdPx?: number;
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
};

const defaultOptions = {
  clearTimer: (timer: unknown) => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
  getRegisteredEvent: getRegisteredWeekEvent,
  holdDelayMs: DEFAULT_HOLD_DELAY_MS,
  isEnabled: false,
  isFormOpen: () => false,
  isPendingEvent: () => false,
  moveThresholdPx: DEFAULT_MOVE_THRESHOLD_PX,
  now: () => performance.now(),
  setTimer: (callback: () => void, delayMs: number) =>
    setTimeout(callback, delayMs),
};

export class WeekInteractionController {
  readonly #options: Required<WeekInteractionControllerOptions>;
  #session: WeekInteractionSession = { phase: "idle" };

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
    this.#session = { phase: "idle" };

    return { eventId, type: "timedDragEnd" };
  }

  getSession(): WeekInteractionSession {
    return this.#session;
  }

  #activatePendingSession(activatedBy: TimedDragActivationReason) {
    if (this.#session.phase !== "pending") {
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
  }

  #clearPendingTimer(session: PendingTimedDragSession) {
    this.#options.clearTimer(session.holdTimer);
  }

  #getEligibleTimedDrag(event: PointerEvent) {
    if (!this.#options.isEnabled || this.#options.isFormOpen()) {
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
