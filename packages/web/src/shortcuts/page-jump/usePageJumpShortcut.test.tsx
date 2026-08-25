import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import { MOD_HOLD_HINT_MS } from "@web/shortcuts/mod-hold/useModHoldHintShortcut";
import {
  PAGE_JUMP_ATTRIBUTE,
  type PageJumpTargetId,
} from "@web/shortcuts/page-jump/page-jump.targets";
import { usePageJumpShortcut } from "@web/shortcuts/page-jump/usePageJumpShortcut";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

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

const pressModDown = () => dispatch("keydown", { key: MOD_KEY, ...MOD_INIT });

const pressModDigit = (digit: string) =>
  dispatch("keydown", { key: digit, code: `Digit${digit}`, ...MOD_INIT });

/**
 * Minimal page DOM with real anchors, so focusPageJumpTarget (the hook's real
 * dispatch target) actually moves focus instead of needing to be mocked.
 */
const buildPage = () => {
  const addAnchor = (id: PageJumpTargetId) => {
    const anchor = document.createElement("section");
    anchor.setAttribute(PAGE_JUMP_ATTRIBUTE, id);
    document.body.append(anchor);
    return anchor;
  };

  const prevArrow = document.createElement("button");
  addAnchor("navigation").append(prevArrow);

  // Roving tab stop, like react-datepicker's focused day.
  const monthDay = document.createElement("div");
  monthDay.setAttribute("tabindex", "0");
  addAnchor("month-picker").append(monthDay);

  return { prevArrow, monthDay };
};

const openEventForm = () => {
  draftActions.startGridDraft({
    activity: "gridClick",
    draft: createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T10:00:00"),
        new Date("2026-05-20T11:00:00"),
      ),
    ),
  });
};

describe("usePageJumpShortcut", () => {
  beforeEach(() => {
    clearAppLockReasons();
  });

  afterEach(() => {
    clearAppLockReasons();
    useDraftStore.setState(initialDraftState, true);
    document.body.innerHTML = "";
  });

  describe("Mod+digit dispatch", () => {
    it("jumps to the mapped page target and prevents default", () => {
      const { monthDay } = buildPage();
      renderHook(() => usePageJumpShortcut());

      const event = pressModDigit("2");

      expect(event.defaultPrevented).toBe(true);
      expect(monthDay).toHaveFocus();
    });

    it("leaves an unmapped digit alone", () => {
      buildPage();
      renderHook(() => usePageJumpShortcut());

      const event = pressModDigit("9");

      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves the digit alone when its target is not mounted", () => {
      // Collapsed sidebar: no month-picker anchor, so Mod+2 stays a browser
      // shortcut instead of being swallowed with nothing to focus.
      renderHook(() => usePageJumpShortcut());

      const event = pressModDigit("2");

      expect(event.defaultPrevented).toBe(false);
    });

    it("ignores a bare digit with no modifier held", () => {
      const { prevArrow } = buildPage();
      prevArrow.focus();
      renderHook(() => usePageJumpShortcut());

      const event = dispatch("keydown", { key: "2", code: "Digit2" });

      expect(event.defaultPrevented).toBe(false);
      expect(prevArrow).toHaveFocus();
    });
  });

  describe("hold-Mod hint chips", () => {
    it("shows hints once Mod is held past the threshold", async () => {
      buildPage();
      const { result } = renderHook(() => usePageJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });

      await waitFor(() => {
        expect(result.current.areHintsVisible).toBe(true);
      });
    });

    it("hides hints on Mod keyup", async () => {
      buildPage();
      const { result } = renderHook(() => usePageJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });
      await waitFor(() => expect(result.current.areHintsVisible).toBe(true));

      act(() => {
        dispatch("keyup", { key: MOD_KEY, ...MOD_INIT });
      });

      expect(result.current.areHintsVisible).toBe(false);
    });
  });

  describe("while the event form is open", () => {
    it("does not dispatch: the form's digit jumps own the gesture", () => {
      const { monthDay, prevArrow } = buildPage();
      prevArrow.focus();
      act(() => {
        openEventForm();
      });
      renderHook(() => usePageJumpShortcut());

      const event = pressModDigit("2");

      expect(event.defaultPrevented).toBe(false);
      expect(monthDay).not.toHaveFocus();
    });

    it("does not arm hints", async () => {
      buildPage();
      act(() => {
        openEventForm();
      });
      const { result } = renderHook(() => usePageJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });

      expect(result.current.areHintsVisible).toBe(false);
    });

    it("hides hints the moment the form opens mid-hold", async () => {
      buildPage();
      const { result } = renderHook(() => usePageJumpShortcut());

      pressModDown();
      await act(async () => {
        await waitPastHold();
      });
      await waitFor(() => expect(result.current.areHintsVisible).toBe(true));

      act(() => {
        openEventForm();
      });

      await waitFor(() => {
        expect(result.current.areHintsVisible).toBe(false);
      });
    });
  });

  it("does not dispatch or arm hints while the app is locked", async () => {
    const { monthDay, prevArrow } = buildPage();
    prevArrow.focus();
    setAppLockReason("test-lock", true);
    const { result } = renderHook(() => usePageJumpShortcut());

    pressModDigit("2");
    expect(monthDay).not.toHaveFocus();

    pressModDown();
    await act(async () => {
      await waitPastHold();
    });
    expect(result.current.areHintsVisible).toBe(false);
  });
});
