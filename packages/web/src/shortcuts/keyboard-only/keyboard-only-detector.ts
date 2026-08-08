/**
 * Pure SHIFT-SHIFT double-tap detector for keyboard-only mode.
 *
 * A tap is keydown → keyup with no other key between and duration below the
 * hold threshold (so hold-to-hint never counts as a tap). Two taps whose
 * release times are within {@link SHIFT_DOUBLE_TAP_MAX_GAP_MS} enter the mode.
 */

import {
  isShiftDoubleTapCandidate,
  SHIFT_DOUBLE_TAP_MAX_GAP_MS,
  SHIFT_HOLD_HINT_THRESHOLD_MS,
} from "@web/shortcuts/shift-hint/shift-hold-detector";

export { SHIFT_DOUBLE_TAP_MAX_GAP_MS, SHIFT_HOLD_HINT_THRESHOLD_MS };

export type KeyboardOnlyDetectorPhase = "idle" | "down";

export type KeyboardOnlyDetectorState = {
  phase: KeyboardOnlyDetectorPhase;
  downAt: number | null;
  lastTapReleasedAt: number | null;
};

export const createKeyboardOnlyDetectorState =
  (): KeyboardOnlyDetectorState => ({
    phase: "idle",
    downAt: null,
    lastTapReleasedAt: null,
  });

export type KeyboardOnlyDetectorEvent =
  | { type: "shiftDown"; now: number; blocked: boolean }
  | { type: "shiftUp"; now: number }
  | { type: "chordKeyDown" }
  | { type: "reset" };

export type KeyboardOnlyDetectorResult = {
  state: KeyboardOnlyDetectorState;
  /** True when this event completed a second quick Shift tap. */
  entered: boolean;
};

export function reduceKeyboardOnlyDetector(
  state: KeyboardOnlyDetectorState,
  event: KeyboardOnlyDetectorEvent,
): KeyboardOnlyDetectorResult {
  switch (event.type) {
    case "shiftDown": {
      if (event.blocked) {
        return {
          state: {
            phase: "idle",
            downAt: null,
            lastTapReleasedAt: state.lastTapReleasedAt,
          },
          entered: false,
        };
      }
      if (state.phase === "down") {
        return { state, entered: false };
      }
      return {
        state: {
          ...state,
          phase: "down",
          downAt: event.now,
        },
        entered: false,
      };
    }
    case "shiftUp": {
      if (state.phase !== "down" || state.downAt === null) {
        return { state, entered: false };
      }

      const heldMs = event.now - state.downAt;
      // Held long enough to be a hold-to-hint, not a tap.
      if (heldMs >= SHIFT_HOLD_HINT_THRESHOLD_MS) {
        return {
          state: {
            phase: "idle",
            downAt: null,
            lastTapReleasedAt: null,
          },
          entered: false,
        };
      }

      const entered = isShiftDoubleTapCandidate({
        lastShiftReleaseAt: state.lastTapReleasedAt,
        now: event.now,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      });

      return {
        state: {
          phase: "idle",
          downAt: null,
          // After entering, clear so a third tap does not re-trigger.
          lastTapReleasedAt: entered ? null : event.now,
        },
        entered,
      };
    }
    case "chordKeyDown": {
      if (state.phase !== "down") {
        return { state, entered: false };
      }
      return {
        state: {
          phase: "idle",
          downAt: null,
          lastTapReleasedAt: null,
        },
        entered: false,
      };
    }
    case "reset": {
      return {
        state: createKeyboardOnlyDetectorState(),
        entered: false,
      };
    }
  }
}
