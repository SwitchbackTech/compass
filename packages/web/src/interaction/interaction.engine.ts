import { FloatingDraftEvent } from "./dom/draft-event";
import {
  type PreparedSourceElement,
  prepareSourceElementForInteraction,
  reapplyPreparedSourceStyles,
  restoreSourceElement,
} from "./dom/source-element.visibility";
import {
  type FloatingDraftEventMount,
  type InteractionAdapter,
} from "./interaction.adapter.types";
import {
  INTERACTION_COMMIT_TEARDOWN_DEADLINE_MS,
  INTERACTION_HOLD_DELAY_MS,
  INTERACTION_MOVE_THRESHOLD_PX,
} from "./interaction.constants";
import {
  createInteractionMetrics,
  type InteractionMetrics,
} from "./interaction.metrics";
import { hasExceededInteractionMoveThreshold } from "./interaction.pointer";
import {
  type InteractionPoint,
  type InteractionPointerUpResult,
  type InteractionSession,
  type MotionInteractionSession,
  type PendingInteractionSession,
} from "./interaction.types";

export interface InteractionEngineSchedulerOptions {
  cancelFrame?: (frame: unknown) => void;
  clearTimer?: (timer: unknown) => void;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => unknown;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
}

export interface InteractionCancellationTargets {
  documentTarget?: Document;
  windowTarget?: Window;
}

interface InteractionEngineOptions<TTarget, TVisual, TResult>
  extends InteractionEngineSchedulerOptions {
  adapter: InteractionAdapter<TTarget, TVisual, TResult>;
  commitTeardownDeadlineMs?: number;
  createMetrics?: () => InteractionMetrics;
  createDraftEvent?: () => FloatingDraftEvent;
  holdDelayMs?: number;
  moveThresholdPx?: number;
}

export interface InteractionEngine<TTarget, TVisual, TResult> {
  cancel(): void;
  connectCancellationEvents(
    targets?: InteractionCancellationTargets,
  ): () => void;
  getMetrics(): InteractionMetrics;
  getSession(): InteractionSession<TTarget, TVisual>;
  handlePointerCancel(event: PointerEvent): void;
  handlePointerDown(event: PointerEvent): boolean;
  handlePointerMove(event: PointerEvent): void;
  handlePointerUp(
    event: PointerEvent,
  ): InteractionPointerUpResult<TTarget, TResult>;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
  /**
   * After edge-nav remounts the grid, the original source node is gone and
   * its dim/hide styles die with it. Rebind the prepared source to the
   * event's new DOM node so placeholder styling survives multi-week drags.
   */
  rebindPreparedSource(nextElement: HTMLElement): void;
}

const defaultOptions = {
  cancelFrame: (frame: unknown) => {
    cancelAnimationFrame(frame as number);
  },
  clearTimer: (timer: unknown) => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
  commitTeardownDeadlineMs: INTERACTION_COMMIT_TEARDOWN_DEADLINE_MS,
  createMetrics: createInteractionMetrics,
  createDraftEvent: () => new FloatingDraftEvent(),
  holdDelayMs: INTERACTION_HOLD_DELAY_MS,
  moveThresholdPx: INTERACTION_MOVE_THRESHOLD_PX,
  now: () => performance.now(),
  requestFrame: (callback: FrameRequestCallback) =>
    requestAnimationFrame(callback),
  setTimer: (callback: () => void, delayMs: number) =>
    setTimeout(callback, delayMs),
};

export const createInteractionEngine = <TTarget, TVisual, TResult>(
  options: InteractionEngineOptions<TTarget, TVisual, TResult>,
): InteractionEngine<TTarget, TVisual, TResult> => {
  const resolvedOptions: Required<
    InteractionEngineOptions<TTarget, TVisual, TResult>
  > = { ...defaultOptions, ...options };
  let activatedAt: number | null = null;
  let latestPointer: InteractionPoint | null = null;
  let metrics = resolvedOptions.createMetrics();
  let draftEvent: FloatingDraftEvent | null = null;
  let pendingCommitTeardown: { frame: unknown; timer: unknown } | null = null;
  let preparedSource: PreparedSourceElement | null = null;
  let previousFrameTimestamp: number | null = null;
  let rafId: unknown = null;
  let scrollSync: { element: EventTarget; handleScroll: () => void } | null =
    null;
  let session: InteractionSession<TTarget, TVisual> = {
    phase: "idle",
  };

  function getMetrics() {
    return metrics;
  }

  function getSession() {
    return session;
  }

  function ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return session.phase !== "idle" && session.pointerId === event.pointerId;
  }

  function handlePointerDown(event: PointerEvent) {
    if (session.phase !== "idle") {
      return false;
    }

    // A new press must never coexist with a held commit draft event or a
    // still-prepared source element from the previous interaction.
    finishPendingCommitTeardown();

    const target = resolvedOptions.adapter.getTarget(event);

    if (!target) {
      return false;
    }

    const sourceElement = resolvedOptions.adapter.getSourceElement(target);
    const holdTimer = resolvedOptions.setTimer(() => {
      activatePendingSession("hold");
    }, resolvedOptions.holdDelayMs);

    resetMetrics("pending");
    session = {
      holdTimer,
      phase: "pending",
      pointerId: event.pointerId,
      sourceElement,
      startPoint: getPointerPoint(event),
      target,
    };

    return true;
  }

  function handlePointerMove(event: PointerEvent) {
    if (session.phase !== "pending" && session.phase !== "motion") {
      return;
    }

    if (event.pointerId !== session.pointerId) {
      return;
    }

    if (session.phase === "pending") {
      if (
        !hasExceededInteractionMoveThreshold(
          getPointerPoint(event),
          session.startPoint,
          resolvedOptions.moveThresholdPx,
        )
      ) {
        return;
      }

      clearPendingTimer(session);
      activatePendingSession("move");
    }

    if (session.phase !== "motion") {
      return;
    }

    metrics.pointerMoveCount += 1;
    latestPointer = getPointerPoint(event);
    scheduleFrame();
  }

  function handlePointerUp(
    event: PointerEvent,
  ): InteractionPointerUpResult<TTarget, TResult> {
    if (session.phase === "idle") {
      return null;
    }

    if (event.pointerId !== session.pointerId) {
      return null;
    }

    if (session.phase === "pending") {
      const target = session.target;
      clearPendingTimer(session);
      session = { phase: "idle" };
      metrics.active = false;
      metrics.phase = "idle";

      return { target, type: "click" };
    }

    const motionSession = session;
    const finalUpdate = resolvedOptions.adapter.updateVisual({
      pointer: getPointerPoint(event),
      target: motionSession.target,
      timestamp: resolvedOptions.now(),
      visual: motionSession.visual,
    });

    const result = resolvedOptions.adapter.commit({
      target: motionSession.target,
      visual: finalUpdate.visual,
    });
    deferCommitTeardown();
    session = { phase: "idle" };

    return { result, type: "commit" };
  }

  function handlePointerCancel(event: PointerEvent) {
    if (session.phase === "idle" || event.pointerId !== session.pointerId) {
      return;
    }

    cancel();
  }

  function handleWindowBlur() {
    cancel();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      cancel();
    }
  }

  function connectCancellationEvents({
    documentTarget = document,
    windowTarget = window,
  }: InteractionCancellationTargets = {}) {
    const handleCancellationEvent = (event: PointerEvent) => {
      handlePointerCancel(event);
    };

    windowTarget.addEventListener("pointercancel", handleCancellationEvent);
    windowTarget.addEventListener(
      "lostpointercapture",
      handleCancellationEvent,
    );
    windowTarget.addEventListener("blur", handleWindowBlur);
    documentTarget.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      windowTarget.removeEventListener(
        "pointercancel",
        handleCancellationEvent,
      );
      windowTarget.removeEventListener(
        "lostpointercapture",
        handleCancellationEvent,
      );
      windowTarget.removeEventListener("blur", handleWindowBlur);
      documentTarget.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }

  function cancel() {
    finishPendingCommitTeardown();

    if (session.phase === "idle") {
      return;
    }

    if (session.phase === "pending") {
      clearPendingTimer(session);
      resolvedOptions.adapter.cancel?.({ target: session.target });
      session = { phase: "idle" };
      metrics.cancellationCount += 1;
      metrics.active = false;
      metrics.phase = "cancelled";
      return;
    }

    resolvedOptions.adapter.cancel?.({
      target: session.target,
      visual: session.visual,
    });
    teardownActiveSession("cancelled");
    session = { phase: "idle" };
  }

  function activatePendingSession(activatedBy: "hold" | "move") {
    if (session.phase !== "pending") {
      return;
    }

    const pendingSession = session;
    const visual = resolvedOptions.adapter.createVisual({
      pointerStart: pendingSession.startPoint,
      sourceElement: pendingSession.sourceElement,
      target: pendingSession.target,
    });

    if (!visual) {
      cancel();
      return;
    }

    const draftEventMount = resolvedOptions.adapter.getDraftEventMount({
      sourceElement: pendingSession.sourceElement,
      target: pendingSession.target,
      visual,
    });
    mountDraftEvent(draftEventMount);
    preparedSource = prepareSourceElementForInteraction(
      pendingSession.sourceElement,
      resolvedOptions.adapter.getSourceElementDraftEventMode?.(
        pendingSession.target,
      ),
    );
    attachScrollSync(
      getNearestScrollableAncestor(pendingSession.sourceElement),
    );
    activatedAt = resolvedOptions.now();
    latestPointer = pendingSession.startPoint;
    metrics.active = true;
    metrics.phase = "motion";
    session = {
      activatedBy,
      phase: "motion",
      pointerId: pendingSession.pointerId,
      sourceElement: pendingSession.sourceElement,
      startPoint: pendingSession.startPoint,
      target: pendingSession.target,
      visual,
    };
    scheduleFrame();
  }

  function attachScrollSync(element: EventTarget | null) {
    if (!element) {
      return;
    }

    const handleScroll = () => {
      if (session.phase === "motion") {
        scheduleFrame();
      }
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    scrollSync = { element, handleScroll };
  }

  function detachScrollSync() {
    if (!scrollSync) {
      return;
    }

    scrollSync.element.removeEventListener("scroll", scrollSync.handleScroll);
    scrollSync = null;
  }

  function mountDraftEvent(mount: FloatingDraftEventMount) {
    const draftEventMountStart = resolvedOptions.now();
    const nextDraftEvent = resolvedOptions.createDraftEvent();
    nextDraftEvent.mount(mount);
    metrics.draftEventMountMs = resolvedOptions.now() - draftEventMountStart;
    draftEvent = nextDraftEvent;
  }

  function clearPendingTimer(session: PendingInteractionSession<TTarget>) {
    resolvedOptions.clearTimer(session.holdTimer);
  }

  function scheduleFrame() {
    if (rafId !== null) {
      return;
    }

    rafId = resolvedOptions.requestFrame((timestamp) => {
      rafId = null;
      runFrame(timestamp);
    });
  }

  function runFrame(timestamp: number) {
    if (session.phase !== "motion" || !latestPointer || !draftEvent) {
      return;
    }

    const frameStart = resolvedOptions.now();
    const next = resolvedOptions.adapter.updateVisual({
      pointer: latestPointer,
      target: session.target,
      timestamp,
      visual: session.visual,
    });
    session = {
      ...session,
      visual: next.visual,
    } satisfies MotionInteractionSession<TTarget, TVisual>;

    if (next.draftEvent) {
      draftEvent.update(next.draftEvent);
      metrics.styleWritesDuringMotion += 1;
    }

    const frameDurationMs = resolvedOptions.now() - frameStart;

    metrics.rafCount += 1;
    metrics.rafDurations.push(frameDurationMs);

    let frameGapMs: number | undefined;
    if (previousFrameTimestamp !== null) {
      frameGapMs = timestamp - previousFrameTimestamp;
      metrics.frameGaps.push(frameGapMs);
    }

    previousFrameTimestamp = timestamp;

    if (metrics.firstFrameLatencyMs === null) {
      metrics.firstFrameLatencyMs =
        resolvedOptions.now() - (activatedAt ?? resolvedOptions.now());
    }

    if (next.shouldContinue) {
      scheduleFrame();
    }
  }

  // Committing hands rendering back to React, which paints the moved event a
  // few scheduler tasks after pointerup. Tearing down immediately would show
  // the restored source element at its pre-interaction geometry until that
  // render lands — a visible flash on release. So the draft event clone stays
  // mounted (and the source stays hidden/dimmed) until the source element
  // reflows to its committed geometry, leaves the DOM, or the deadline passes
  // (commits that change nothing never reflow).
  function deferCommitTeardown() {
    const element = preparedSource?.element;

    if (!element) {
      teardownActiveSession("commit");
      return;
    }

    const initialRect = element.getBoundingClientRect();
    const checkFrame = () => {
      if (!pendingCommitTeardown) {
        return;
      }

      pendingCommitTeardown.frame = null;

      if (hasSourceReflowed(element, initialRect)) {
        finishPendingCommitTeardown();
        return;
      }

      pendingCommitTeardown.frame = resolvedOptions.requestFrame(checkFrame);
    };

    pendingCommitTeardown = {
      frame: null,
      timer: resolvedOptions.setTimer(
        finishPendingCommitTeardown,
        resolvedOptions.commitTeardownDeadlineMs,
      ),
    };
    pendingCommitTeardown.frame = resolvedOptions.requestFrame(checkFrame);
  }

  function finishPendingCommitTeardown() {
    if (!pendingCommitTeardown) {
      return;
    }

    if (pendingCommitTeardown.frame !== null) {
      resolvedOptions.cancelFrame(pendingCommitTeardown.frame);
    }

    resolvedOptions.clearTimer(pendingCommitTeardown.timer);
    pendingCommitTeardown = null;
    teardownActiveSession("commit");
  }

  function hasSourceReflowed(element: Element, initialRect: DOMRect) {
    const rect = element.getBoundingClientRect();

    return (
      !element.isConnected ||
      rect.top !== initialRect.top ||
      rect.left !== initialRect.left ||
      rect.width !== initialRect.width ||
      rect.height !== initialRect.height
    );
  }

  function teardownActiveSession(phase: "cancelled" | "commit") {
    if (rafId !== null) {
      resolvedOptions.cancelFrame(rafId);
      rafId = null;
    }

    draftEvent?.unmount();
    draftEvent = null;
    detachScrollSync();

    if (preparedSource) {
      restoreSourceElement(preparedSource);
      preparedSource = null;
    }

    latestPointer = null;
    activatedAt = null;
    previousFrameTimestamp = null;
    metrics.active = false;
    metrics.phase = phase;

    if (phase === "cancelled") {
      metrics.cancellationCount += 1;
    }
  }

  function resetMetrics(phase: InteractionMetrics["phase"]) {
    metrics = resolvedOptions.createMetrics();
    metrics.phase = phase;
  }

  function rebindPreparedSource(nextElement: HTMLElement) {
    if (!preparedSource) return;

    if (preparedSource.element === nextElement && nextElement.isConnected) {
      // React may have cleared inline styles on reconcile; re-apply without
      // overwriting the stored pre-interaction values used on restore.
      reapplyPreparedSourceStyles(preparedSource);
      return;
    }

    const mode = preparedSource.draftEventMode;

    if (preparedSource.element.isConnected) {
      restoreSourceElement(preparedSource);
    }

    preparedSource = prepareSourceElementForInteraction(nextElement, mode);

    if (session.phase === "pending" || session.phase === "motion") {
      session = { ...session, sourceElement: nextElement };
    }
  }

  return {
    cancel,
    connectCancellationEvents,
    getMetrics,
    getSession,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    ownsPointer,
    rebindPreparedSource,
  };
};

const getPointerPoint = (event: PointerEvent): InteractionPoint => ({
  x: event.clientX,
  y: event.clientY,
});

// The draft event tracks the dragged element visually, so it needs to re-sync
// whenever its nearest scrollable ancestor scrolls — regardless of what kind
// of element is being dragged.
const getNearestScrollableAncestor = (
  element: HTMLElement,
): HTMLElement | null => {
  let node = element.parentElement;

  while (node) {
    if (node.scrollHeight > node.clientHeight) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};
