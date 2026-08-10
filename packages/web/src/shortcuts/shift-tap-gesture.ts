/**
 * One shared document-level listener for the Shift-tap gesture, driving both
 * shift-hint (press shows day-jump hints; quick release confirms) and
 * keyboard-only mode (double tap toggles it). Previously each feature ran
 * its own independent listener + reducer instance and coordinated only by
 * timing. One listener means the two can no longer race: Shift down can
 * `press` immediately so hints appear before release; a following second
 * tap within the window fires `doubleTap` instead — which cancels whatever
 * the first tap just started (shift-hint listens for this and turns hints
 * back off). Chord or hold-past-threshold fires `cancel` so Shift+J and
 * long holds do not leave jump mode on.
 */

import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import {
  createShiftJumpGestureState,
  isShiftKey,
  reduceShiftJumpGesture,
  SHIFT_TAP_MAX_HOLD_MS,
  type ShiftJumpGestureState,
} from "@web/shortcuts/shift-hint/shift-hold-detector";

export type ShiftTapGestureEvent = {
  type: "press" | "singleTap" | "doubleTap" | "cancel";
};
export type ShiftTapGestureListener = (event: ShiftTapGestureEvent) => void;

let gestureState: ShiftJumpGestureState = createShiftJumpGestureState();
const listeners = new Set<ShiftTapGestureListener>();
let holdTimer: ReturnType<typeof setTimeout> | null = null;

const notify = (type: ShiftTapGestureEvent["type"]) => {
  for (const listener of listeners) listener({ type });
};

const clearHoldTimer = () => {
  if (holdTimer === null) return;
  clearTimeout(holdTimer);
  holdTimer = null;
};

const armHoldExpiry = () => {
  clearHoldTimer();
  holdTimer = setTimeout(() => {
    holdTimer = null;
    const result = reduceShiftJumpGesture(gestureState, {
      type: "holdExpired",
    });
    gestureState = result.state;
    if (result.cancel) notify("cancel");
  }, SHIFT_TAP_MAX_HOLD_MS);
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.defaultPrevented) return;

  if (isShiftKey(event)) {
    if (event.repeat) return;
    const blocked = isAppLocked() || isEditableKeyboardTarget(event);
    const result = reduceShiftJumpGesture(gestureState, {
      type: "shiftDown",
      now: Date.now(),
      blocked,
    });
    gestureState = result.state;
    if (result.press) {
      notify("press");
      armHoldExpiry();
    }
    return;
  }

  // Chord while Shift is down (Shift+J, Shift+Arrow, …): never toggle.
  if (gestureState.phase === "armed") {
    clearHoldTimer();
    const result = reduceShiftJumpGesture(gestureState, {
      type: "chordKeyDown",
    });
    gestureState = result.state;
    if (result.cancel) notify("cancel");
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  if (!isShiftKey(event)) return;
  // Keep counting a hold if the other Shift key is still down.
  if (event.shiftKey) return;

  clearHoldTimer();
  const result = reduceShiftJumpGesture(gestureState, {
    type: "shiftUp",
    now: Date.now(),
  });
  gestureState = result.state;

  if (result.forceOff) {
    notify("doubleTap");
  } else if (result.cancel) {
    notify("cancel");
  } else if (result.toggle) {
    if (isAppLocked() || isEditableKeyboardTarget(event)) return;
    notify("singleTap");
  }
};

const onBlur = () => {
  clearHoldTimer();
  gestureState = reduceShiftJumpGesture(gestureState, { type: "reset" }).state;
};

let attached = false;

const attach = () => {
  if (attached) return;
  attached = true;
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onBlur);
};

const detach = () => {
  attached = false;
  clearHoldTimer();
  document.removeEventListener("keydown", onKeyDown, true);
  document.removeEventListener("keyup", onKeyUp, true);
  window.removeEventListener("blur", onBlur);
};

export function subscribeToShiftTapGesture(
  listener: ShiftTapGestureListener,
): () => void {
  listeners.add(listener);
  attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detach();
      gestureState = createShiftJumpGestureState();
    }
  };
}

/**
 * Clears in-flight gesture state (armed/tap-gap tracking). Used by both a
 * consumer that just exited via a means other than the gesture itself (ESC)
 * and by tests resetting between cases.
 */
export function resetSharedShiftTapGesture(): void {
  clearHoldTimer();
  gestureState = createShiftJumpGestureState();
}
