/**
 * One shared document-level listener for the Shift-tap gesture, driving both
 * shift-hint (single tap toggles day-jump hints) and keyboard-only mode
 * (double tap toggles it). Previously each feature ran its own independent
 * listener + reducer instance and coordinated only by timing (shift-hint
 * deferred its activation past the double-tap window so a following second
 * tap could retroactively cancel it). One listener means the two can no
 * longer race: a single tap always fires `singleTap` immediately, and a
 * following second tap within the window fires `doubleTap` instead - which
 * cancels whatever the first tap just started (shift-hint listens for this
 * and turns hints back off).
 */

import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import {
  createShiftJumpGestureState,
  isShiftKey,
  reduceShiftJumpGesture,
  type ShiftJumpGestureState,
} from "@web/shortcuts/shift-hint/shift-hold-detector";

export type ShiftTapGestureEvent = { type: "singleTap" | "doubleTap" };
export type ShiftTapGestureListener = (event: ShiftTapGestureEvent) => void;

let gestureState: ShiftJumpGestureState = createShiftJumpGestureState();
const listeners = new Set<ShiftTapGestureListener>();

const notify = (type: ShiftTapGestureEvent["type"]) => {
  for (const listener of listeners) listener({ type });
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.defaultPrevented) return;

  if (isShiftKey(event)) {
    if (event.repeat) return;
    const blocked = isAppLocked() || isEditableKeyboardTarget(event);
    gestureState = reduceShiftJumpGesture(gestureState, {
      type: "shiftDown",
      now: Date.now(),
      blocked,
    }).state;
    return;
  }

  // Chord while Shift is down (Shift+J, Shift+Arrow, …): never toggle.
  if (gestureState.phase === "armed") {
    gestureState = reduceShiftJumpGesture(gestureState, {
      type: "chordKeyDown",
    }).state;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  if (!isShiftKey(event)) return;
  // Keep counting a hold if the other Shift key is still down.
  if (event.shiftKey) return;

  const result = reduceShiftJumpGesture(gestureState, {
    type: "shiftUp",
    now: Date.now(),
  });
  gestureState = result.state;

  if (result.forceOff) {
    notify("doubleTap");
  } else if (result.toggle) {
    if (isAppLocked() || isEditableKeyboardTarget(event)) return;
    notify("singleTap");
  }
};

const onBlur = () => {
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
  gestureState = createShiftJumpGestureState();
}
