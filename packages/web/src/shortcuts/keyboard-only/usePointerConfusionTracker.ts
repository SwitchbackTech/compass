import { useEffect, useRef } from "react";
import {
  type BlockedPointerAttempt,
  POINTER_PASS_ATTRIBUTE,
  resolveBlockedPointerAttempt,
} from "@web/shortcuts/keyboard-only/pointer-action";
import {
  POINTER_CONFUSION_DECAY_INTERVAL_MS,
  POINTER_CONFUSION_REGION_RADIUS_PX,
  POINTER_CONFUSION_REGION_WINDOW_MS,
  pointerConfusionActions,
} from "@web/shortcuts/keyboard-only/pointer-confusion.store";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

const isFormControl = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']",
    ),
  );
};

const isPointerPassTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`[${POINTER_PASS_ATTRIBUTE}]`));
};

const isWorkingLink = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  const link = target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return false;
  return link.href.length > 0 && link.href !== "#";
};

const isNativeButton = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button"));
};

/**
 * Elements that look interactive but intentionally ignore mouse activation
 * (grid event cards, annotated chrome, etc.).
 */
const isInertInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (isPointerPassTarget(target)) return false;
  if (isFormControl(target)) return false;
  if (isWorkingLink(target)) return false;
  if (isNativeButton(target)) return false;

  return Boolean(target.closest("[data-pointer-action], [role='button']"));
};

const hasMeaningfulSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;
  return selection.toString().trim().length > 0;
};

/**
 * Tracks mouse confusion signals and adjusts the per-session score that gates
 * the keyboard-only hint. Mounted once in RootShell for calendar views.
 */
export function usePointerConfusionTracker(enabled = true) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const lastClickRef = useRef<{
    x: number;
    y: number;
    at: number;
    attempt: BlockedPointerAttempt;
  } | null>(null);
  const selectionHandledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let decayTimer: number | null = null;

    const scheduleDecay = () => {
      if (decayTimer !== null) {
        window.clearTimeout(decayTimer);
      }
      decayTimer = window.setTimeout(() => {
        if (!enabledRef.current) return;
        pointerConfusionActions.decayScore();
        scheduleDecay();
      }, POINTER_CONFUSION_DECAY_INTERVAL_MS);
    };

    const onActivity = () => {
      if (!enabledRef.current) return;
      scheduleDecay();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!enabledRef.current) return;
      onActivity();

      const target = event.target;
      if (!isInertInteractiveTarget(target)) {
        lastClickRef.current = null;
        return;
      }

      const path = event.composedPath() as EventTarget[];
      const attempt = resolveBlockedPointerAttempt(path);
      const now = performance.now();
      const previous = lastClickRef.current;
      const x = event.clientX;
      const y = event.clientY;

      if (
        previous &&
        now - previous.at <= POINTER_CONFUSION_REGION_WINDOW_MS &&
        Math.hypot(previous.x - x, previous.y - y) <=
          POINTER_CONFUSION_REGION_RADIUS_PX
      ) {
        pointerConfusionActions.recordRegionBurst(attempt);
      } else {
        pointerConfusionActions.recordDeadClick(attempt);
      }

      lastClickRef.current = { x, y, at: now, attempt };
    };

    const onSelectionChange = () => {
      if (!enabledRef.current) return;
      if (!hasMeaningfulSelection()) {
        selectionHandledRef.current = false;
        return;
      }
      if (selectionHandledRef.current) return;
      selectionHandledRef.current = true;
      pointerConfusionActions.recordTextSelection();
      onActivity();
    };

    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, { passive: true });
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("selectionchange", onSelectionChange);
    scheduleDecay();

    return () => {
      if (decayTimer !== null) {
        window.clearTimeout(decayTimer);
      }
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, onActivity);
      }
      window.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [enabled]);
}
