import {
  createShiftJumpGestureState,
  isShiftDoubleTapCandidate,
  reduceShiftJumpGesture,
  SHIFT_DOUBLE_TAP_MAX_GAP_MS,
  SHIFT_HOLD_HINT_THRESHOLD_MS,
} from "@web/shortcuts/shift-hint/shift-hold-detector";
import { describe, expect, it } from "bun:test";

describe("reduceShiftJumpGesture", () => {
  it("emits toggle on a quick Shift tap", () => {
    const state = createShiftJumpGestureState();
    let result = reduceShiftJumpGesture(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    expect(result.state.phase).toBe("armed");
    expect(result.toggle).toBe(false);

    result = reduceShiftJumpGesture(result.state, {
      type: "shiftUp",
      now: 1100,
    });
    expect(result.toggle).toBe(true);
    expect(result.forceOff).toBe(false);
    expect(result.state.phase).toBe("idle");
    expect(result.state.lastShiftReleaseAt).toBe(1100);
  });

  it("does not toggle on a long press", () => {
    let state = createShiftJumpGestureState();
    state = reduceShiftJumpGesture(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    }).state;
    const result = reduceShiftJumpGesture(state, {
      type: "shiftUp",
      now: 1000 + SHIFT_HOLD_HINT_THRESHOLD_MS,
    });
    expect(result.toggle).toBe(false);
    expect(result.forceOff).toBe(false);
    expect(result.state.lastShiftReleaseAt).toBeNull();
  });

  it("cancels armed on chord key so Shift+J never toggles", () => {
    let state = createShiftJumpGestureState();
    state = reduceShiftJumpGesture(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    }).state;
    state = reduceShiftJumpGesture(state, { type: "chordKeyDown" }).state;
    expect(state.phase).toBe("idle");

    const result = reduceShiftJumpGesture(state, {
      type: "shiftUp",
      now: 1100,
    });
    expect(result.toggle).toBe(false);
  });

  it("does not arm when blocked (editable / app lock)", () => {
    const result = reduceShiftJumpGesture(createShiftJumpGestureState(), {
      type: "shiftDown",
      now: 1000,
      blocked: true,
    });
    expect(result.state.phase).toBe("idle");
    expect(result.toggle).toBe(false);
  });

  it("forceOff on the second quick tap (Shift-Shift)", () => {
    let state = createShiftJumpGestureState();
    state = reduceShiftJumpGesture(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    }).state;
    state = reduceShiftJumpGesture(state, {
      type: "shiftUp",
      now: 1050,
    }).state;
    expect(state.lastShiftReleaseAt).toBe(1050);

    state = reduceShiftJumpGesture(state, {
      type: "shiftDown",
      now: 1100,
      blocked: false,
    }).state;
    const result = reduceShiftJumpGesture(state, {
      type: "shiftUp",
      now: 1150,
    });
    expect(result.toggle).toBe(false);
    expect(result.forceOff).toBe(true);
    expect(result.state.lastShiftReleaseAt).toBeNull();
  });
});

describe("hold vs double-tap coordination", () => {
  it("records release times so a future SHIFT-SHIFT detector can use them", () => {
    let state = createShiftJumpGestureState();
    state = reduceShiftJumpGesture(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    }).state;
    state = reduceShiftJumpGesture(state, {
      type: "shiftUp",
      now: 1050,
    }).state;
    expect(
      isShiftDoubleTapCandidate({
        lastShiftReleaseAt: state.lastShiftReleaseAt,
        now: 1050 + 100,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      }),
    ).toBe(true);
  });

  it("does not treat a long hold release as a double-tap candidate", () => {
    expect(SHIFT_HOLD_HINT_THRESHOLD_MS).toBeGreaterThan(100);
    expect(
      isShiftDoubleTapCandidate({
        lastShiftReleaseAt: 1000,
        now: 1000 + 1000,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      }),
    ).toBe(false);
  });
});
