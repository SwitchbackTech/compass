import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, renderHook, waitFor } from "@testing-library/react";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  MOD_HOLD_HINT_MS,
  useFormDigitJumpShortcut,
} from "@web/shortcuts/form-digit-jump/useFormDigitJumpShortcut";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const focusEventFormField = mock((_field: string) => true);

mock.module("@web/common/utils/form/form.util", () => ({
  focusEventFormField,
}));

/** Matches what the hook resolves Mod to on this platform. */
const isMac = resolveModifier("Mod") === "Meta";
const MOD_KEY = isMac ? "Meta" : "Control";
const MOD_INIT: KeyboardEventInit = isMac
  ? { metaKey: true }
  : { ctrlKey: true };

const PAST_HOLD_MS = MOD_HOLD_HINT_MS + 150;
const waitPastHold = () =>
  new Promise((resolve) => setTimeout(resolve, PAST_HOLD_MS));

const dispatch = (type: "keydown" | "keyup", init: KeyboardEventInit) => {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
};

const pressModDown = ({ repeat = false }: { repeat?: boolean } = {}) =>
  dispatch("keydown", { key: MOD_KEY, repeat, ...MOD_INIT });
const releaseMod = () => dispatch("keyup", { key: MOD_KEY, ...MOD_INIT });

const pressModDigit = (digit: string, code: string) =>
  dispatch("keydown", { key: digit, code, ...MOD_INIT });

describe("useFormDigitJumpShortcut", () => {
  beforeEach(() => {
    clearAppLockReasons();
    focusEventFormField.mockClear();
  });

  afterEach(() => {
    clearAppLockReasons();
    document.body.innerHTML = "";
  });

  describe("Mod+digit dispatch", () => {
    it("jumps to the mapped field and prevents default", () => {
      renderHook(() => useFormDigitJumpShortcut());

      const event = pressModDigit("3", "Digit3");

      expect(event.defaultPrevented).toBe(true);
      expect(focusEventFormField).toHaveBeenCalledWith("end");
    });

    it("maps every digit 1-8 to its field, in DOM order", () => {
      renderHook(() => useFormDigitJumpShortcut());

      const cases = [
        ["1", "title"],
        ["2", "start"],
        ["3", "end"],
        ["4", "recurrence"],
        ["5", "calendar"],
        ["6", "color"],
        ["7", "location"],
        ["8", "description"],
      ] as const;

      for (const [digit, field] of cases) {
        focusEventFormField.mockClear();
        pressModDigit(digit, `Digit${digit}`);
        expect(focusEventFormField).toHaveBeenCalledWith(field);
      }
    });

    it("ignores a bare digit with no modifier held", () => {
      renderHook(() => useFormDigitJumpShortcut());

      const event = dispatch("keydown", { key: "3", code: "Digit3" });

      expect(event.defaultPrevented).toBe(false);
      expect(focusEventFormField).not.toHaveBeenCalled();
    });

    it("ignores Mod+Shift+digit", () => {
      renderHook(() => useFormDigitJumpShortcut());

      const event = dispatch("keydown", {
        key: "3",
        code: "Digit3",
        shiftKey: true,
        ...MOD_INIT,
      });

      expect(event.defaultPrevented).toBe(false);
      expect(focusEventFormField).not.toHaveBeenCalled();
    });

    it("ignores Mod+Alt+digit", () => {
      renderHook(() => useFormDigitJumpShortcut());

      const event = dispatch("keydown", {
        key: "3",
        code: "Digit3",
        altKey: true,
        ...MOD_INIT,
      });

      expect(event.defaultPrevented).toBe(false);
      expect(focusEventFormField).not.toHaveBeenCalled();
    });

    it("suppresses the digit's replayed keyup (macOS metaKey-false replay)", () => {
      renderHook(() => useFormDigitJumpShortcut());

      pressModDigit("3", "Digit3");
      // macOS replays the keyup after Cmd is released, with metaKey already false.
      const keyUp = dispatch("keyup", { key: "3", code: "Digit3" });

      expect(keyUp.defaultPrevented).toBe(true);
    });
  });

  describe("hold-Mod hint chips", () => {
    it("stays hidden before the hold threshold", () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown();

      expect(result.current.areHintsVisible).toBe(false);
    });

    it("shows hints once Mod is held past the threshold", async () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });

      await waitFor(() => {
        expect(result.current.areHintsVisible).toBe(true);
      });
    });

    it("hides hints on Mod keyup", async () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });
      await waitFor(() => expect(result.current.areHintsVisible).toBe(true));

      act(() => {
        releaseMod();
      });

      expect(result.current.areHintsVisible).toBe(false);
    });

    it("does not re-arm on a repeated Mod keydown", async () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown({ repeat: true });
      await act(async () => {
        await waitPastHold();
      });

      expect(result.current.areHintsVisible).toBe(false);
    });

    it("cancels the pending hold when another chord is pressed", async () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown();
      // Mod+K: not a mapped digit, so it just cancels the pending arm.
      act(() => {
        dispatch("keydown", { key: "k", ...MOD_INIT });
      });
      await act(async () => {
        await waitPastHold();
      });

      expect(result.current.areHintsVisible).toBe(false);
    });

    it("hides on window blur", async () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });
      await waitFor(() => expect(result.current.areHintsVisible).toBe(true));

      act(() => {
        window.dispatchEvent(new Event("blur"));
      });

      expect(result.current.areHintsVisible).toBe(false);
    });

    it("hides on pointerdown", async () => {
      const { result } = renderHook(() => useFormDigitJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });
      await waitFor(() => expect(result.current.areHintsVisible).toBe(true));

      act(() => {
        document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      });

      expect(result.current.areHintsVisible).toBe(false);
    });
  });

  it("does not dispatch or arm hints while the app is locked", async () => {
    setAppLockReason("test-lock", true);
    const { result } = renderHook(() => useFormDigitJumpShortcut());

    pressModDigit("3", "Digit3");
    expect(focusEventFormField).not.toHaveBeenCalled();

    pressModDown();
    await act(async () => {
      await waitPastHold();
    });
    expect(result.current.areHintsVisible).toBe(false);
  });
});
