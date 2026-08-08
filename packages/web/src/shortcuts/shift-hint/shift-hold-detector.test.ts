import {
  createShiftHoldState,
  isShiftDoubleTapCandidate,
  reduceShiftHold,
  SHIFT_DOUBLE_TAP_MAX_GAP_MS,
  SHIFT_HOLD_HINT_THRESHOLD_MS,
} from "@web/shortcuts/shift-hint/shift-hold-detector";
import { describe, expect, it } from "bun:test";

describe("reduceShiftHold", () => {
  it("activates only after the hold threshold", () => {
    let state = createShiftHoldState();
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    expect(state.phase).toBe("pending");
    expect(state.pendingStartedAt).toBe(1000);

    state = reduceShiftHold(state, { type: "thresholdReached" });
    expect(state.phase).toBe("active");
  });

  it("treats a quick Shift tap as idle and records release time", () => {
    let state = createShiftHoldState();
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    state = reduceShiftHold(state, { type: "shiftUp", now: 1100 });

    expect(state.phase).toBe("idle");
    expect(state.lastShiftReleaseAt).toBe(1100);
    expect(state.pendingStartedAt).toBeNull();
  });

  it("cancels pending on chord key so Shift+J never flashes hints", () => {
    let state = createShiftHoldState();
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    state = reduceShiftHold(state, { type: "chordKeyDown" });
    expect(state.phase).toBe("idle");

    state = reduceShiftHold(state, { type: "thresholdReached" });
    expect(state.phase).toBe("idle");
  });

  it("does not start pending when blocked (editable / app lock)", () => {
    let state = createShiftHoldState();
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1000,
      blocked: true,
    });
    expect(state.phase).toBe("idle");
  });

  it("dismisses active hints on Shift release without stamping a tap", () => {
    let state = createShiftHoldState();
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    state = reduceShiftHold(state, { type: "thresholdReached" });
    state = reduceShiftHold(state, { type: "shiftUp", now: 1300 });
    expect(state.phase).toBe("idle");
    expect(state.lastShiftReleaseAt).toBeNull();
  });
});

describe("hold vs double-tap coordination", () => {
  it("records release times so a future SHIFT-SHIFT detector can use them", () => {
    let state = createShiftHoldState();
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1000,
      blocked: false,
    });
    state = reduceShiftHold(state, { type: "shiftUp", now: 1050 });
    expect(
      isShiftDoubleTapCandidate({
        lastShiftReleaseAt: state.lastShiftReleaseAt,
        now: 1050 + 100,
        maxGapMs: SHIFT_DOUBLE_TAP_MAX_GAP_MS,
      }),
    ).toBe(true);

    // A completed hold also releases, but pending never became active on a
    // double-tap path: two quick taps stay idle.
    state = reduceShiftHold(state, {
      type: "shiftDown",
      now: 1150,
      blocked: false,
    });
    state = reduceShiftHold(state, { type: "shiftUp", now: 1200 });
    expect(state.phase).toBe("idle");
    expect(state.lastShiftReleaseAt).toBe(1200);
  });

  it("does not treat a long hold release as a double-tap candidate gap start only", () => {
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
