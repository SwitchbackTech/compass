import { clearAppLockReasons } from "@web/shortcuts/app-lock";
import { SHIFT_TAP_MAX_HOLD_MS } from "@web/shortcuts/shift-hint/shift-hold-detector";
import {
  resetSharedShiftTapGesture,
  subscribeToShiftTapGesture,
} from "@web/shortcuts/shift-tap-gesture";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const dispatch = (
  type: "keydown" | "keyup",
  key: string,
  init: KeyboardEventInit = {},
) => {
  document.dispatchEvent(
    new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      ...init,
    }),
  );
};

const tapShift = () => {
  dispatch("keydown", "Shift");
  dispatch("keyup", "Shift");
};

describe("shift-tap-gesture", () => {
  beforeEach(() => {
    clearAppLockReasons();
    resetSharedShiftTapGesture();
  });

  afterEach(() => {
    clearAppLockReasons();
    resetSharedShiftTapGesture();
  });

  it("notifies every subscriber of press then single tap", () => {
    const events: string[] = [];
    const unsubscribeA = subscribeToShiftTapGesture((event) =>
      events.push(`a:${event.type}`),
    );
    const unsubscribeB = subscribeToShiftTapGesture((event) =>
      events.push(`b:${event.type}`),
    );

    tapShift();

    expect(events).toEqual([
      "a:press",
      "b:press",
      "a:singleTap",
      "b:singleTap",
    ]);

    unsubscribeA();
    unsubscribeB();
  });

  it("notifies every subscriber of a double tap instead of two single taps", () => {
    const events: string[] = [];
    const unsubscribe = subscribeToShiftTapGesture((event) =>
      events.push(event.type),
    );

    tapShift();
    tapShift();

    expect(events).toEqual(["press", "singleTap", "doubleTap"]);

    unsubscribe();
  });

  it("cancels an optimistic press on a Shift chord", () => {
    const events: string[] = [];
    const unsubscribe = subscribeToShiftTapGesture((event) =>
      events.push(event.type),
    );

    dispatch("keydown", "Shift");
    dispatch("keydown", "j", { shiftKey: true });
    dispatch("keyup", "j", { shiftKey: true });
    dispatch("keyup", "Shift");

    expect(events).toEqual(["press", "cancel"]);

    unsubscribe();
  });

  it("cancels an optimistic press once the hold threshold elapses", async () => {
    const events: string[] = [];
    const unsubscribe = subscribeToShiftTapGesture((event) =>
      events.push(event.type),
    );

    dispatch("keydown", "Shift");
    await Bun.sleep(SHIFT_TAP_MAX_HOLD_MS + 20);
    dispatch("keyup", "Shift");

    expect(events).toEqual(["press", "cancel"]);

    unsubscribe();
  });

  it("stops listening once the last subscriber unsubscribes", () => {
    const events: string[] = [];
    const unsubscribe = subscribeToShiftTapGesture((event) =>
      events.push(event.type),
    );

    unsubscribe();
    tapShift();

    expect(events).toEqual([]);
  });
});
