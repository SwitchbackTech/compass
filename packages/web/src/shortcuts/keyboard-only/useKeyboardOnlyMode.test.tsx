import { act, renderHook } from "@testing-library/react";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  initialKeyboardOnlyState,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { useKeyboardOnlyMode } from "@web/shortcuts/keyboard-only/useKeyboardOnlyMode";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import {
  resetEditSequenceArm,
  useEditSequenceShortcut,
} from "@web/shortcuts/useEditSequenceShortcut";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const dispatchKey = (
  type: "keydown" | "keyup",
  key: string,
  init: KeyboardEventInit = {},
) => {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
};

const pressH = () => {
  dispatchKey("keydown", "h");
  dispatchKey("keyup", "h");
};

describe("useKeyboardOnlyMode", () => {
  beforeEach(() => {
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    eventJumpActions.reset();
    resetEditSequenceArm();
    clearAppLockReasons();
    document.body.innerHTML = `<div id="root"></div>`;
  });

  afterEach(() => {
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    eventJumpActions.reset();
    resetEditSequenceArm();
    clearAppLockReasons();
    document.body.innerHTML = "";
  });

  it("enters on h and suppresses clicks until Escape", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      pressH();
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
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
      window.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(clicked).toBe(false);
    expect(useKeyboardOnlyStore.getState().blockedClickPulse).toBe(1);

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

  it("allows clicks inside the onboarding tour card while keyboard-only is on", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      pressH();
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);

    const tour = document.createElement("div");
    tour.setAttribute("data-onboarding-tour", "");
    const button = document.createElement("button");
    button.textContent = "Next";
    tour.appendChild(button);
    document.body.appendChild(tour);

    let clicked = false;
    button.addEventListener("click", () => {
      clicked = true;
    });

    act(() => {
      button.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(clicked).toBe(true);
    expect(useKeyboardOnlyStore.getState().blockedClickPulse).toBe(0);
  });

  it("exits on a second h", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      pressH();
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);

    act(() => {
      pressH();
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });

  it("does not enter while app-locked", () => {
    setAppLockReason("commandPalette", true);
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      pressH();
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });

  it("does not enter on Shift-Shift", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      dispatchKey("keydown", "Shift");
      dispatchKey("keyup", "Shift");
      dispatchKey("keydown", "Shift");
      dispatchKey("keyup", "Shift");
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });

  it("does not steal h while the e edit sequence is armed", () => {
    const onSequence = mock(() => {});
    // Match production mount order: Hardcore (RootShell) before edit sequences.
    renderHook(() => useKeyboardOnlyMode());
    renderHook(() => useEditSequenceShortcut({ onSequence }));

    act(() => {
      dispatchKey("keydown", "e");
      dispatchKey("keydown", "h");
    });

    // While armed, Hardcore yields so the edit sequence can disarm on the
    // unknown follow key without entering keyboard-only.
    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
    expect(onSequence).not.toHaveBeenCalled();
  });

  it("clears event jump when entering hardcore", () => {
    renderHook(() => useKeyboardOnlyMode());
    eventJumpActions.setActive(true);
    expect(useEventJumpStore.getState().isActive).toBe(true);

    act(() => {
      pressH();
    });

    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    expect(useEventJumpStore.getState().isActive).toBe(false);
  });
});
