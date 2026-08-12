import { resolveModifier } from "@tanstack/react-hotkeys";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import {
  selectEditSequenceMenuVisible,
  useEditSequenceStore,
} from "@web/shortcuts/edit-sequence/edit-sequence.store";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import {
  isEditSequenceArmed,
  resetEditSequenceArm,
  useEditSequenceShortcut,
} from "@web/shortcuts/useEditSequenceShortcut";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

/** Matches what the hook accepts for Mod on this platform. */
const MOD_INIT: KeyboardEventInit =
  resolveModifier("Mod") === "Meta" ? { metaKey: true } : { ctrlKey: true };

/** The hook's fast-path window is 600ms; wait past it for the menu. */
const PAST_ARM_WINDOW_MS = 750;
const waitPastArmWindow = () =>
  new Promise((resolve) => setTimeout(resolve, PAST_ARM_WINDOW_MS));

const isMenuVisible = () =>
  selectEditSequenceMenuVisible(useEditSequenceStore.getState());

describe("useEditSequenceShortcut", () => {
  beforeEach(() => {
    clearAppLockReasons();
    resetEditSequenceArm();
    eventJumpActions.reset();
  });

  afterEach(() => {
    clearAppLockReasons();
    resetEditSequenceArm();
    eventJumpActions.reset();
    document.body.innerHTML = "";
  });

  describe("fast path", () => {
    it("fires the mapped field for e then t", () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      pressKey("t");

      expect(onSequence).toHaveBeenCalledTimes(1);
      expect(onSequence).toHaveBeenCalledWith("title");
    });

    it("stays silent within the arm window", () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");

      expect(isEditSequenceArmed()).toBe(true);
      expect(isMenuVisible()).toBe(false);
    });

    it("maps each shipped follow key to its form field", () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      const cases = [
        ["t", "title"],
        ["l", "location"],
        ["d", "description"],
        ["s", "start"],
        ["e", "end"],
        ["r", "recurrence"],
        ["a", "calendar"],
        ["c", "color"],
      ] as const;

      for (const [second, field] of cases) {
        onSequence.mockClear();
        pressKey("e");
        pressKey(second);
        expect(onSequence).toHaveBeenCalledWith(field);
      }
    });

    it("preventsDefault the follow key's keyup so nav chords stay quiet", () => {
      const onSequence = mock(() => {});
      const seen = mock((_event: KeyboardEvent) => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));
      document.addEventListener("keyup", seen, true);

      pressKey("e");
      pressKey("t");

      expect(onSequence).toHaveBeenCalledWith("title");
      const tUps = seen.mock.calls
        .map(([event]) => event as KeyboardEvent)
        .filter((event) => event.key === "t");
      expect(tUps.length).toBeGreaterThan(0);
      expect(tUps.every((event) => event.defaultPrevented === true)).toBe(true);

      document.removeEventListener("keyup", seen, true);
    });

    it("does not preventDefault an unmapped second key", () => {
      const onSequence = mock(() => {});
      const seen = mock((_event: KeyboardEvent) => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));
      document.addEventListener("keydown", seen, true);

      pressKey("e");
      pressKey("j");

      expect(onSequence).not.toHaveBeenCalled();
      expect(isEditSequenceArmed()).toBe(false);
      const jEvents = seen.mock.calls
        .map(([event]) => event as KeyboardEvent)
        .filter((event) => event.key === "j");
      expect(jEvents.length).toBeGreaterThan(0);
      expect(jEvents.every((event) => event.defaultPrevented === false)).toBe(
        true,
      );

      document.removeEventListener("keydown", seen, true);
    });
  });

  describe("which-key menu", () => {
    it("opens the menu and stays armed once the window elapses", async () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      await waitPastArmWindow();

      expect(isMenuVisible()).toBe(true);
      expect(isEditSequenceArmed()).toBe(true);
      expect(onSequence).not.toHaveBeenCalled();
    });

    it("still fires the field after the menu opens", async () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      await waitPastArmWindow();
      pressKey("r");

      expect(onSequence).toHaveBeenCalledWith("recurrence");
      expect(isMenuVisible()).toBe(false);
      expect(isEditSequenceArmed()).toBe(false);
    });

    it("cancels on Escape without leaking the keyup suppression", async () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      await waitPastArmWindow();
      pressKey("Escape");

      expect(isEditSequenceArmed()).toBe(false);
      expect(isMenuVisible()).toBe(false);

      // A following `t` must reach the Today shortcut, not this sequence.
      const seen = mock((_event: KeyboardEvent) => {});
      document.addEventListener("keydown", seen, true);
      pressKey("t");
      expect(onSequence).not.toHaveBeenCalled();
      const tEvents = seen.mock.calls
        .map(([event]) => event as KeyboardEvent)
        .filter((event) => event.key === "t");
      expect(tEvents.every((event) => event.defaultPrevented === false)).toBe(
        true,
      );
      document.removeEventListener("keydown", seen, true);
    });

    it("cancels on pointerdown", () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      document.dispatchEvent(new Event("pointerdown", { bubbles: true }));

      expect(isEditSequenceArmed()).toBe(false);
    });

    it("cancels on window blur", () => {
      const onSequence = mock(() => {});
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      window.dispatchEvent(new Event("blur"));

      expect(isEditSequenceArmed()).toBe(false);
    });
  });

  describe("arming rules", () => {
    it("stays inert while typing in an input", () => {
      const onSequence = mock(() => {});
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      renderHook(() => useEditSequenceShortcut({ onSequence }));
      pressKey("e", {}, input);
      pressKey("t", {}, input);

      expect(onSequence).not.toHaveBeenCalled();
    });

    it("arms from Mod+E even inside an input", () => {
      const onSequence = mock(() => {});
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      renderHook(() => useEditSequenceShortcut({ onSequence }));
      pressKey("e", { keyDownInit: MOD_INIT, keyUpInit: MOD_INIT }, input);
      pressKey("l", {}, input);

      expect(onSequence).toHaveBeenCalledWith("location");
    });

    it("stays inert while the app lock is held", () => {
      const onSequence = mock(() => {});
      setAppLockReason("test-lock", true);

      renderHook(() => useEditSequenceShortcut({ onSequence }));
      pressKey("e");
      pressKey("t");

      expect(onSequence).not.toHaveBeenCalled();
    });

    it("yields to event jump mode instead of arming underneath it", () => {
      // Event jump already stands down for an armed sequence; without the
      // mirror check a stray `e` would arm under the jump hints and swallow
      // the next day letter.
      const onSequence = mock(() => {});
      eventJumpActions.setActive(true);
      renderHook(() => useEditSequenceShortcut({ onSequence }));

      pressKey("e");
      expect(isEditSequenceArmed()).toBe(false);

      pressKey("t");
      expect(onSequence).not.toHaveBeenCalled();
    });

    it("does not arm when canArm is false, so the next key passes through", () => {
      const onSequence = mock(() => {});
      const seen = mock((_event: KeyboardEvent) => {});
      renderHook(() =>
        useEditSequenceShortcut({ canArm: () => false, onSequence }),
      );
      document.addEventListener("keydown", seen, true);

      pressKey("e");
      expect(isEditSequenceArmed()).toBe(false);

      pressKey("t");
      expect(onSequence).not.toHaveBeenCalled();
      const tEvents = seen.mock.calls
        .map(([event]) => event as KeyboardEvent)
        .filter((event) => event.key === "t");
      expect(tEvents.every((event) => event.defaultPrevented === false)).toBe(
        true,
      );

      document.removeEventListener("keydown", seen, true);
    });
  });
});
