import {
  createKeyboardOnlyDetectorState,
  reduceKeyboardOnlyDetector,
  SHIFT_DOUBLE_TAP_MAX_GAP_MS,
  SHIFT_HOLD_HINT_THRESHOLD_MS,
} from "@web/shortcuts/keyboard-only/keyboard-only-detector";
import { describe, expect, it } from "bun:test";

describe("reduceKeyboardOnlyDetector", () => {
  it("enters on two quick Shift taps within the gap", () => {
    const state = createKeyboardOnlyDetectorState();

    let result = reduceKeyboardOnlyDetector(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1050,
    });
    expect(result.entered).toBe(false);
    expect(result.state.lastTapReleasedAt).toBe(1050);

    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftDown",
      now: 1100,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1150,
    });
    expect(result.entered).toBe(true);
    expect(result.state.lastTapReleasedAt).toBeNull();
  });

  it("does not enter when the second tap is too slow", () => {
    const state = createKeyboardOnlyDetectorState();
    let result = reduceKeyboardOnlyDetector(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1050,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftDown",
      now: 1050 + SHIFT_DOUBLE_TAP_MAX_GAP_MS + 1,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1050 + SHIFT_DOUBLE_TAP_MAX_GAP_MS + 40,
    });
    expect(result.entered).toBe(false);
    expect(result.state.lastTapReleasedAt).toBe(
      1050 + SHIFT_DOUBLE_TAP_MAX_GAP_MS + 40,
    );
  });

  it("does not treat a hold as a tap", () => {
    const state = createKeyboardOnlyDetectorState();
    let result = reduceKeyboardOnlyDetector(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1000 + SHIFT_HOLD_HINT_THRESHOLD_MS + 10,
    });
    expect(result.entered).toBe(false);
    expect(result.state.lastTapReleasedAt).toBeNull();

    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftDown",
      now: 1300,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1350,
    });
    expect(result.entered).toBe(false);
  });

  it("cancels a pending tap on chord keys (Shift+J)", () => {
    const state = createKeyboardOnlyDetectorState();
    let result = reduceKeyboardOnlyDetector(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    result = reduceKeyboardOnlyDetector(result.state, { type: "chordKeyDown" });
    expect(result.state.phase).toBe("idle");
    expect(result.state.lastTapReleasedAt).toBeNull();

    result = reduceKeyboardOnlyDetector(result.state, {
      type: "shiftUp",
      now: 1100,
    });
    expect(result.entered).toBe(false);
  });

  it("ignores blocked Shift downs (app lock / editable)", () => {
    const state = createKeyboardOnlyDetectorState();
    const result = reduceKeyboardOnlyDetector(state, {
      type: "shiftDown",
      now: 1000,
      blocked: true,
    });
    expect(result.state.phase).toBe("idle");
    expect(result.state.downAt).toBeNull();
  });
});

describe("hold vs double-tap coexistence", () => {
  it("uses a gap larger than the hold threshold so both detectors can share Shift", () => {
    expect(SHIFT_DOUBLE_TAP_MAX_GAP_MS).toBeGreaterThan(
      SHIFT_HOLD_HINT_THRESHOLD_MS,
    );
  });
});
