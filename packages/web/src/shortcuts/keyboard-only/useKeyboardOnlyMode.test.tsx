import { act, renderHook } from "@testing-library/react";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  initialKeyboardOnlyState,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { useKeyboardOnlyMode } from "@web/shortcuts/keyboard-only/useKeyboardOnlyMode";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const dispatchKey = (
  type: "keydown" | "keyup",
  key: string,
  init: KeyboardEventInit = {},
) => {
  const event = new KeyboardEvent(type, {
    key,
    code: key === "Shift" ? "ShiftLeft" : key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
};

const tapShift = () => {
  dispatchKey("keydown", "Shift");
  dispatchKey("keyup", "Shift", { shiftKey: false });
};

describe("useKeyboardOnlyMode", () => {
  beforeEach(() => {
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    clearAppLockReasons();
    document.body.innerHTML = `<div id="root"></div>`;
  });

  afterEach(() => {
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    clearAppLockReasons();
    document.body.innerHTML = "";
  });

  it("enters on SHIFT-SHIFT and suppresses clicks until Escape", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      tapShift();
      tapShift();
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);

    const root = document.getElementById("root")!;
    const button = document.createElement("button");
    button.textContent = "Click me";
    root.appendChild(button);

    let clicked = false;
    button.addEventListener("click", () => {
      clicked = true;
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(clicked).toBe(false);
    expect(useKeyboardOnlyStore.getState().blockedClickPulse).toBeGreaterThan(
      0,
    );

    act(() => {
      dispatchKey("keydown", "Escape");
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);

    clicked = false;
    act(() => {
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    expect(clicked).toBe(true);
  });

  it("does not enter while app-locked", () => {
    setAppLockReason("commandPalette", true);
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      tapShift();
      tapShift();
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });
});
