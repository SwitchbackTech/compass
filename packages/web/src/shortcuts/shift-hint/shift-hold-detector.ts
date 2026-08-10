/**
 * Pure Shift gesture state for event-jump mode.
 *
 * Shift down → optional optimistic `press` (hints can show immediately).
 * Quick Shift up → `toggle` (hook confirms or toggles off). Chord while
 * armed, or hold past {@link SHIFT_TAP_MAX_HOLD_MS}, cancels so Shift+J /
 * long holds never leave jump mode on. A second quick tap within
 * {@link SHIFT_DOUBLE_TAP_MAX_GAP_MS} is a Shift-Shift candidate: force jump
 * mode off so keyboard-only can win.
 */

export const SHIFT_TAP_MAX_HOLD_MS = 200;

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
  | { type: "holdExpired" }
  | { type: "reset" };

export type ShiftJumpGestureResult = {
  state: ShiftJumpGestureState;
  /** Shift down that may show jump hints before release. */
  press: boolean;
  /** Quick tap up: confirm optimistic press, or toggle off if already on. */
  toggle: boolean;
  /** Second quick tap: force jump mode off for keyboard-only coexistence. */
  forceOff: boolean;
  /** Chord or hold timeout: undo an optimistic press. */
  cancel: boolean;
};

const idleResult = (
  state: ShiftJumpGestureState,
  overrides: Partial<ShiftJumpGestureResult> = {},
): ShiftJumpGestureResult => ({
  state,
  press: false,
  toggle: false,
  forceOff: false,
  cancel: false,
  ...overrides,
});

export function reduceShiftJumpGesture(
  state: ShiftJumpGestureState,
  event: ShiftJumpGestureEvent,
): ShiftJumpGestureResult {
  switch (event.type) {
    case "shiftDown": {
      if (event.blocked) {
        return idleResult({
          phase: "idle",
          armedAt: null,
          lastShiftReleaseAt: state.lastShiftReleaseAt,
        });
      }
      if (state.phase === "armed") {
        return idleResult(state);
      }
      const isSecondTap = isShiftDoubleTapCandidate({
        lastShiftReleaseAt: state.lastShiftReleaseAt,
        now: event.now,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      });
      return idleResult(
        {
          ...state,
          phase: "armed",
          armedAt: event.now,
        },
        // Second tap of Shift-Shift must not flash hints before forceOff.
        { press: !isSecondTap },
      );
    }
    case "shiftUp": {
      if (state.phase !== "armed" || state.armedAt === null) {
        return idleResult(state);
      }

      const heldMs = event.now - state.armedAt;
      // Long press: not a tap (also keeps Shift-Shift keyboard-only clean).
      if (heldMs >= SHIFT_TAP_MAX_HOLD_MS) {
        return idleResult(
          {
            phase: "idle",
            armedAt: null,
            lastShiftReleaseAt: null,
          },
          { cancel: true },
        );
      }

      const isDoubleTap = isShiftDoubleTapCandidate({
        lastShiftReleaseAt: state.lastShiftReleaseAt,
        now: event.now,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      });

      if (isDoubleTap) {
        return idleResult(
          {
            phase: "idle",
            armedAt: null,
            lastShiftReleaseAt: null,
          },
          { forceOff: true },
        );
      }

      return idleResult(
        {
          phase: "idle",
          armedAt: null,
          lastShiftReleaseAt: event.now,
        },
        { toggle: true },
      );
    }
    case "chordKeyDown": {
      if (state.phase !== "armed") {
        return idleResult(state);
      }
      return idleResult(
        {
          phase: "idle",
          armedAt: null,
          // Chord cancels the tap; do not seed a double-tap gap.
          lastShiftReleaseAt: null,
        },
        { cancel: true },
      );
    }
    case "holdExpired": {
      if (state.phase !== "armed") {
        return idleResult(state);
      }
      return idleResult(
        {
          phase: "idle",
          armedAt: null,
          lastShiftReleaseAt: null,
        },
        { cancel: true },
      );
    }
    case "reset": {
      return idleResult(createShiftJumpGestureState());
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
