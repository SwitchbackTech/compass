import { act, renderHook } from "@testing-library/react";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
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

  it("enters on h and exits on Escape", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      pressH();
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);

    act(() => {
      dispatchKey("keydown", "Escape");
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });

  // Blocking of trusted mouse events cannot be exercised via dispatchEvent
  // (isTrusted is [LegacyUnforgeable]); that behavior is unit-tested on the
  // listener in pointer-block.test.ts and end-to-end in
  // e2e/timed/keyboard-only-mode.spec.ts. Here we prove the wiring passes
  // synthetic activation through while active.
  it("passes synthetic .click() calls while active", () => {
    renderHook(() => useKeyboardOnlyMode());

    act(() => {
      pressH();
    });
    expect(useKeyboardOnlyStore.getState().isActive).toBe(true);

    const button = document.createElement("button");
    document.getElementById("root")!.appendChild(button);
    let clicked = false;
    button.addEventListener("click", () => {
      clicked = true;
    });

    act(() => {
      button.click();
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

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    renderHook(() => useKeyboardOnlyMode());

    expect(() => {
      dispatchMissingKey("keydown");
      dispatchMissingKey("keyup");
    }).not.toThrow();

    expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
  });
});
