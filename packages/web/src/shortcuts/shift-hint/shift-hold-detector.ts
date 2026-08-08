/**
 * Pure SHIFT-hold state for event flash hints.
 *
 * Hold (≥ threshold) → active. Quick tap → idle (records release time for a
 * future SHIFT-SHIFT detector). A chord key while pending cancels before
 * hints appear, so Shift+J / Shift+Arrow never flash.
 */

export const SHIFT_HOLD_HINT_THRESHOLD_MS = 200;

/** Max gap between two quick Shift taps to enter keyboard-only mode. */
export const SHIFT_DOUBLE_TAP_MAX_GAP_MS = 400;

export const isShiftKey = (event: Pick<KeyboardEvent, "key" | "code">) =>
  event.key === "Shift" ||
  event.code === "ShiftLeft" ||
  event.code === "ShiftRight";

export type ShiftHoldPhase = "idle" | "pending" | "active";

export type ShiftHoldState = {
  phase: ShiftHoldPhase;
  pendingStartedAt: number | null;
  /**
   * Timestamp of the last completed Shift keyup. Keyboard-only mode (double
   * Shift) can read this without sharing the hold timer.
   */
  lastShiftReleaseAt: number | null;
  hintPrefix: string;
};

export const createShiftHoldState = (): ShiftHoldState => ({
  phase: "idle",
  pendingStartedAt: null,
  lastShiftReleaseAt: null,
  hintPrefix: "",
});

export type ShiftHoldEvent =
  | { type: "shiftDown"; now: number; blocked: boolean }
  | { type: "shiftUp"; now: number }
  | { type: "thresholdReached" }
  | { type: "chordKeyDown" }
  | { type: "setPrefix"; prefix: string }
  | { type: "dismiss" };

export function reduceShiftHold(
  state: ShiftHoldState,
  event: ShiftHoldEvent,
): ShiftHoldState {
  switch (event.type) {
    case "shiftDown": {
      if (event.blocked) {
        return {
          ...state,
          phase: "idle",
          pendingStartedAt: null,
          hintPrefix: "",
        };
      }
      if (state.phase === "active") {
        return state;
      }
      return {
        ...state,
        phase: "pending",
        pendingStartedAt: event.now,
        hintPrefix: "",
      };
    }
    case "shiftUp": {
      // Only short taps (pending → idle without activating) stamp
      // lastShiftReleaseAt for a future SHIFT-SHIFT detector. Completed holds
      // and idle/blocked ups must not look like double-tap candidates.
      if (state.phase === "pending") {
        return {
          ...state,
          phase: "idle",
          pendingStartedAt: null,
          lastShiftReleaseAt: event.now,
          hintPrefix: "",
        };
      }
      if (state.phase === "active") {
        return {
          ...state,
          phase: "idle",
          pendingStartedAt: null,
          hintPrefix: "",
        };
      }
      return state;
    }
    case "thresholdReached": {
      if (state.phase !== "pending") return state;
      return {
        ...state,
        phase: "active",
        pendingStartedAt: null,
        hintPrefix: "",
      };
    }
    case "chordKeyDown": {
      if (state.phase !== "pending") return state;
      return {
        ...state,
        phase: "idle",
        pendingStartedAt: null,
        hintPrefix: "",
      };
    }
    case "setPrefix": {
      if (state.phase !== "active") return state;
      return { ...state, hintPrefix: event.prefix };
    }
    case "dismiss": {
      return {
        ...state,
        phase: "idle",
        pendingStartedAt: null,
        hintPrefix: "",
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
