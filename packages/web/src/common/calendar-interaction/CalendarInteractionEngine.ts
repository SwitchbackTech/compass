import {
  type CalendarInteractionAdapter,
  type CalendarInteractionOverlayMount,
} from "./CalendarInteractionAdapter";
import {
  type CalendarInteractionMetrics,
  createCalendarInteractionMetrics,
} from "./CalendarInteractionMetrics";
import {
  type CalendarInteractionPoint,
  type CalendarInteractionPointerUpResult,
  type CalendarInteractionSession,
  type MotionCalendarInteractionSession,
  type PendingCalendarInteractionSession,
} from "./CalendarInteractionSession";
import { CalendarInteractionOverlay } from "./dom/CalendarInteractionOverlay";
import {
  markSourcePlaceholder,
  restoreSourcePlaceholder,
  type SourcePlaceholder,
} from "./dom/sourcePlaceholder";

interface CalendarInteractionEngineOptions<TTarget, TVisual, TResult> {
  adapter: CalendarInteractionAdapter<TTarget, TVisual, TResult>;
  cancelFrame?: (frame: unknown) => void;
  clearTimer?: (timer: unknown) => void;
  createMetrics?: () => CalendarInteractionMetrics;
  createOverlay?: () => CalendarInteractionOverlay;
  holdDelayMs?: number;
  moveThresholdPx?: number;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => unknown;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
}

const defaultOptions = {
  cancelFrame: (frame: unknown) => {
    cancelAnimationFrame(frame as number);
  },
  clearTimer: (timer: unknown) => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
  createMetrics: createCalendarInteractionMetrics,
  createOverlay: () => new CalendarInteractionOverlay(),
  holdDelayMs: 750,
  moveThresholdPx: 25,
  now: () => performance.now(),
  requestFrame: (callback: FrameRequestCallback) =>
    requestAnimationFrame(callback),
  setTimer: (callback: () => void, delayMs: number) =>
    setTimeout(callback, delayMs),
};

export class CalendarInteractionEngine<TTarget, TVisual, TResult> {
  readonly #options: Required<
    CalendarInteractionEngineOptions<TTarget, TVisual, TResult>
  >;
  #activatedAt: number | null = null;
  #latestPointer: CalendarInteractionPoint | null = null;
  #metrics: CalendarInteractionMetrics;
  #overlay: CalendarInteractionOverlay | null = null;
  #placeholder: SourcePlaceholder | null = null;
  #previousFrameTimestamp: number | null = null;
  #rafId: unknown = null;
  #session: CalendarInteractionSession<TTarget, TVisual> = { phase: "idle" };

  constructor(
    options: CalendarInteractionEngineOptions<TTarget, TVisual, TResult>,
  ) {
    this.#options = { ...defaultOptions, ...options };
    this.#metrics = this.#options.createMetrics();
  }

  getMetrics() {
    return this.#metrics;
  }

  getSession() {
    return this.#session;
  }

  handlePointerDown(event: PointerEvent) {
    if (this.#session.phase !== "idle") {
      return false;
    }

    const target = this.#options.adapter.getTarget(event);

    if (!target) {
      return false;
    }

    const sourceElement = this.#options.adapter.getSourceElement(target);
    const holdTimer = this.#options.setTimer(() => {
      this.#activatePendingSession("hold");
    }, this.#options.holdDelayMs);

    this.#resetMetrics("pending");
    this.#session = {
      holdTimer,
      phase: "pending",
      pointerId: event.pointerId,
      sourceElement,
      startPoint: getPointerPoint(event),
      target,
    };

    return true;
  }

  handlePointerMove(event: PointerEvent) {
    if (this.#session.phase !== "pending" && this.#session.phase !== "motion") {
      return;
    }

    if (event.pointerId !== this.#session.pointerId) {
      return;
    }

    if (this.#session.phase === "pending") {
      if (
        !hasExceededMoveThreshold(
          getPointerPoint(event),
          this.#session.startPoint,
          this.#options.moveThresholdPx,
        )
      ) {
        return;
      }

      this.#clearPendingTimer(this.#session);
      this.#activatePendingSession("move");
    }

    if (this.#session.phase !== "motion") {
      return;
    }

    this.#metrics.pointerMoveCount += 1;
    this.#latestPointer = getPointerPoint(event);
    this.#scheduleFrame();
  }

  handlePointerUp(
    event: PointerEvent,
  ): CalendarInteractionPointerUpResult<TTarget, TResult> {
    if (this.#session.phase === "idle") {
      return null;
    }

    if (event.pointerId !== this.#session.pointerId) {
      return null;
    }

    if (this.#session.phase === "pending") {
      const target = this.#session.target;
      this.#clearPendingTimer(this.#session);
      this.#session = { phase: "idle" };
      this.#metrics.active = false;
      this.#metrics.phase = "idle";

      return { target, type: "click" };
    }

    const session = this.#session;
    const result = this.#options.adapter.commit({
      target: session.target,
      visual: session.visual,
    });
    this.#teardownActiveSession("commit");
    this.#session = { phase: "idle" };

    return { result, type: "commit" };
  }

  handlePointerCancel(event: PointerEvent) {
    if (
      this.#session.phase === "idle" ||
      event.pointerId !== this.#session.pointerId
    ) {
      return;
    }

    this.cancel();
  }

  handleWindowBlur = () => {
    this.cancel();
  };

  handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      this.cancel();
    }
  };

  connectCancellationEvents({
    documentTarget = document,
    windowTarget = window,
  }: {
    documentTarget?: Document;
    windowTarget?: Window;
  } = {}) {
    const handlePointerCancel = (event: PointerEvent) => {
      this.handlePointerCancel(event);
    };

    windowTarget.addEventListener("pointercancel", handlePointerCancel);
    windowTarget.addEventListener("lostpointercapture", handlePointerCancel);
    windowTarget.addEventListener("blur", this.handleWindowBlur);
    documentTarget.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    return () => {
      windowTarget.removeEventListener("pointercancel", handlePointerCancel);
      windowTarget.removeEventListener(
        "lostpointercapture",
        handlePointerCancel,
      );
      windowTarget.removeEventListener("blur", this.handleWindowBlur);
      documentTarget.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    };
  }

  cancel() {
    if (this.#session.phase === "idle") {
      return;
    }

    if (this.#session.phase === "pending") {
      this.#clearPendingTimer(this.#session);
      this.#options.adapter.cancel?.({ target: this.#session.target });
      this.#session = { phase: "idle" };
      this.#metrics.cancellationCount += 1;
      this.#metrics.active = false;
      this.#metrics.phase = "cancelled";
      return;
    }

    this.#options.adapter.cancel?.({
      target: this.#session.target,
      visual: this.#session.visual,
    });
    this.#teardownActiveSession("cancelled");
    this.#session = { phase: "idle" };
  }

  #activatePendingSession(activatedBy: "hold" | "move") {
    if (this.#session.phase !== "pending") {
      return;
    }

    const session = this.#session;
    const visual = this.#options.adapter.createVisual({
      pointerStart: session.startPoint,
      sourceElement: session.sourceElement,
      target: session.target,
    });

    if (!visual) {
      this.cancel();
      return;
    }

    const overlayMount = this.#options.adapter.getOverlayMount({
      sourceElement: session.sourceElement,
      target: session.target,
      visual,
    });
    this.#mountOverlay(overlayMount);
    this.#placeholder = markSourcePlaceholder(session.sourceElement);
    this.#activatedAt = this.#options.now();
    this.#latestPointer = session.startPoint;
    this.#metrics.active = true;
    this.#metrics.phase = "motion";
    this.#session = {
      activatedBy,
      phase: "motion",
      pointerId: session.pointerId,
      sourceElement: session.sourceElement,
      startPoint: session.startPoint,
      target: session.target,
      visual,
    };
    this.#scheduleFrame();
  }

  #mountOverlay(mount: CalendarInteractionOverlayMount) {
    const overlayMountStart = this.#options.now();
    const overlay = this.#options.createOverlay();
    overlay.mount(mount);
    this.#metrics.overlayMountMs = this.#options.now() - overlayMountStart;
    this.#overlay = overlay;
  }

  #clearPendingTimer(session: PendingCalendarInteractionSession<TTarget>) {
    this.#options.clearTimer(session.holdTimer);
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
      !this.#overlay
    ) {
      return;
    }

    const frameStart = this.#options.now();
    const next = this.#options.adapter.updateVisual({
      pointer: this.#latestPointer,
      target: this.#session.target,
      timestamp,
      visual: this.#session.visual,
    });
    this.#session = {
      ...this.#session,
      visual: next.visual,
    } satisfies MotionCalendarInteractionSession<TTarget, TVisual>;

    if (next.overlay) {
      this.#overlay.update(next.overlay);
      this.#metrics.styleWritesDuringMotion += 1;
    }

    this.#metrics.rafCount += 1;
    this.#metrics.rafDurations.push(this.#options.now() - frameStart);

    if (this.#previousFrameTimestamp !== null) {
      this.#metrics.frameGaps.push(timestamp - this.#previousFrameTimestamp);
    }

    this.#previousFrameTimestamp = timestamp;

    if (this.#metrics.firstFrameLatencyMs === null) {
      this.#metrics.firstFrameLatencyMs =
        this.#options.now() - (this.#activatedAt ?? this.#options.now());
    }

    if (next.shouldContinue) {
      this.#scheduleFrame();
    }
  }

  #teardownActiveSession(phase: "cancelled" | "commit") {
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

    this.#latestPointer = null;
    this.#activatedAt = null;
    this.#previousFrameTimestamp = null;
    this.#metrics.active = false;
    this.#metrics.phase = phase;

    if (phase === "cancelled") {
      this.#metrics.cancellationCount += 1;
    }
  }

  #resetMetrics(phase: CalendarInteractionMetrics["phase"]) {
    this.#metrics = this.#options.createMetrics();
    this.#metrics.phase = phase;
  }
}

const getPointerPoint = (event: PointerEvent): CalendarInteractionPoint => ({
  x: event.clientX,
  y: event.clientY,
});

const hasExceededMoveThreshold = (
  current: CalendarInteractionPoint,
  initial: CalendarInteractionPoint,
  threshold: number,
) =>
  Math.abs(current.x - initial.x) > threshold ||
  Math.abs(current.y - initial.y) > threshold;
