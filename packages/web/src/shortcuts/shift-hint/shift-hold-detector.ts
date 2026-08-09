/**
 * Pure Shift gesture state for event-jump mode.
 *
 * Quick Shift tap → toggle (hook applies). Chord while armed cancels so
 * Shift+J / Shift+Arrow never toggle. Long press (≥ threshold) is not a tap.
 * A second quick tap within {@link SHIFT_DOUBLE_TAP_MAX_GAP_MS} is a
 * Shift-Shift candidate: force jump mode off so keyboard-only can win.
 */

export const SHIFT_HOLD_HINT_THRESHOLD_MS = 200;

/** Max gap between two quick Shift taps to enter keyboard-only mode. */
export const SHIFT_DOUBLE_TAP_MAX_GAP_MS = 400;

export const isShiftKey = (event: Pick<KeyboardEvent, "key" | "code">) =>
  event.key === "Shift" ||
  event.code === "ShiftLeft" ||
  event.code === "ShiftRight";

export type ShiftJumpGesturePhase = "idle" | "armed";

export type ShiftJumpGestureState = {
  phase: ShiftJumpGesturePhase;
  armedAt: number | null;
  /**
   * Timestamp of the last completed quick Shift tap. Used to detect the
   * second tap of Shift-Shift (force jump off; keyboard-only owns that).
   */
  lastShiftReleaseAt: number | null;
};

export const createShiftJumpGestureState = (): ShiftJumpGestureState => ({
  phase: "idle",
  armedAt: null,
  lastShiftReleaseAt: null,
});

export type ShiftJumpGestureEvent =
  | { type: "shiftDown"; now: number; blocked: boolean }
  | { type: "shiftUp"; now: number }
  | { type: "chordKeyDown" }
  | { type: "reset" };

export type ShiftJumpGestureResult = {
  state: ShiftJumpGestureState;
  /** Quick tap that should toggle jump mode (not a Shift-Shift second tap). */
  toggle: boolean;
  /** Second quick tap: force jump mode off for keyboard-only coexistence. */
  forceOff: boolean;
};

export function reduceShiftJumpGesture(
  state: ShiftJumpGestureState,
  event: ShiftJumpGestureEvent,
): ShiftJumpGestureResult {
  switch (event.type) {
    case "shiftDown": {
      if (event.blocked) {
        return {
          state: {
            phase: "idle",
            armedAt: null,
            lastShiftReleaseAt: state.lastShiftReleaseAt,
          },
          toggle: false,
          forceOff: false,
        };
      }
      if (state.phase === "armed") {
        return { state, toggle: false, forceOff: false };
      }
      return {
        state: {
          ...state,
          phase: "armed",
          armedAt: event.now,
        },
        toggle: false,
        forceOff: false,
      };
    }
    case "shiftUp": {
      if (state.phase !== "armed" || state.armedAt === null) {
        return { state, toggle: false, forceOff: false };
      }

      const heldMs = event.now - state.armedAt;
      // Long press: not a tap (also keeps Shift-Shift keyboard-only clean).
      if (heldMs >= SHIFT_HOLD_HINT_THRESHOLD_MS) {
        return {
          state: {
            phase: "idle",
            armedAt: null,
            lastShiftReleaseAt: null,
          },
          toggle: false,
          forceOff: false,
        };
      }

      const isDoubleTap = isShiftDoubleTapCandidate({
        lastShiftReleaseAt: state.lastShiftReleaseAt,
        now: event.now,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      });

      if (isDoubleTap) {
        return {
          state: {
            phase: "idle",
            armedAt: null,
            lastShiftReleaseAt: null,
          },
          toggle: false,
          forceOff: true,
        };
      }

      return {
        state: {
          phase: "idle",
          armedAt: null,
          lastShiftReleaseAt: event.now,
        },
        toggle: true,
        forceOff: false,
      };
    }
    case "chordKeyDown": {
      if (state.phase !== "armed") {
        return { state, toggle: false, forceOff: false };
      }
      return {
        state: {
          phase: "idle",
          armedAt: null,
          // Chord cancels the tap; do not seed a double-tap gap.
          lastShiftReleaseAt: null,
        },
        toggle: false,
        forceOff: false,
      };
    }
    case "reset": {
      return {
        state: createShiftJumpGestureState(),
        toggle: false,
        forceOff: false,
      };
    }
  }
}

/** True when a second Shift tap would count as double-tap, not a hold. */
export function isShiftDoubleTapCandidate({
  lastShiftReleaseAt,
  now,
  maxGapMs,
}: {
  lastShiftReleaseAt: number | null;
  now: number;
  maxGapMs: number;
}): boolean {
  if (lastShiftReleaseAt === null) return false;
  const gap = now - lastShiftReleaseAt;
  return gap >= 0 && gap <= maxGapMs;
}
