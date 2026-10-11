import { act, renderHook } from "@testing-library/react";
import {
  MOD_HOLD_HINT_MS,
  useModHoldHintShortcut,
} from "@web/shortcuts/mod-hold/useModHoldHintShortcut";
import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";

const dispatchKeydown = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
};

/**
 * Windows reports AltGr as ctrlKey + altKey, and the browser fires a synthetic
 * Control keydown (altKey still false) right before the AltGraph keydown.
 */
const pressAltGr = () => {
  dispatchKeydown({ key: "Control", ctrlKey: true, altKey: false });
  dispatchKeydown({ key: "AltGraph", ctrlKey: true, altKey: true });
};

describe("useModHoldHintShortcut on Windows", () => {
  const platformDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    "platform",
  );

  beforeEach(() => {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      get: () => "Win32",
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (platformDescriptor) {
      Object.defineProperty(window.navigator, "platform", platformDescriptor);
    } else {
      delete (window.navigator as { platform?: string }).platform;
    }
  });

  const renderModHold = () => {
    const onModChord = jest.fn(() => true);
    const onHintsRevealed = jest.fn();
    const { result } = renderHook(() =>
      useModHoldHintShortcut({ onModChord, onHintsRevealed }),
    );
    return { result, onModChord, onHintsRevealed };
  };

  it("reveals hints after a plain Ctrl hold", () => {
    const { result, onHintsRevealed } = renderModHold();

    dispatchKeydown({ key: "Control", ctrlKey: true });
    act(() => {
      jest.advanceTimersByTime(MOD_HOLD_HINT_MS + 1);
    });

    expect(result.current.areHintsVisible).toBe(true);
    expect(onHintsRevealed).toHaveBeenCalledTimes(1);
  });

  it("does not reveal hints while AltGr is held", () => {
    const { result, onHintsRevealed } = renderModHold();

    pressAltGr();
    act(() => {
      jest.advanceTimersByTime(MOD_HOLD_HINT_MS + 1);
    });

    expect(result.current.areHintsVisible).toBe(false);
    expect(onHintsRevealed).not.toHaveBeenCalled();
  });

  it("does not treat AltGr plus a digit as a Mod chord", () => {
    const { onModChord } = renderModHold();

    pressAltGr();
    const event = dispatchKeydown({
      code: "Digit1",
      key: "1",
      ctrlKey: true,
      altKey: true,
    });

    expect(onModChord).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
