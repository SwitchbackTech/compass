import { act, renderHook } from "@testing-library/react";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import {
  CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES,
  calendarEventIdElementSelector,
} from "@web/grid/interaction/view-event-registry";
import { useShortcutTipsStore } from "@web/shortcuts/tips/shortcut-tips.store";
import { useShortcutTipTrigger } from "@web/shortcuts/tips/useShortcutTipTrigger";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const resetStore = () => {
  useShortcutTipsStore.setState({
    muted: false,
    mouseStreak: 0,
    activeTipId: null,
    lastShownTipId: null,
    lastRotatedAt: null,
  });
};

/** Focuses a stand-in for a calendar event card so `eventFocused` is true. */
const focusCalendarEvent = () => {
  const card = document.createElement("div");
  card.setAttribute(CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES[0], "evt-1");
  card.tabIndex = -1;
  document.body.appendChild(card);
  card.focus();
  return card;
};

describe("useShortcutTipTrigger", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
    document.body.innerHTML = "";
  });

  it("credits the edit-sequence tip on a bare e", () => {
    const card = focusCalendarEvent();
    expect(
      document.activeElement?.closest(calendarEventIdElementSelector()),
    ).toBe(card);

    renderHook(() => useShortcutTipTrigger());
    act(() => useShortcutTipsStore.setState({ activeTipId: "edit-sequence" }));

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "e", bubbles: true }),
      );
    });

    expect(useShortcutTipsStore.getState().activeTipId).toBeNull();
  });

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    focusCalendarEvent();
    renderHook(() => useShortcutTipTrigger());
    act(() => useShortcutTipsStore.setState({ activeTipId: "edit-sequence" }));

    expect(() => {
      act(() => {
        dispatchMissingKey("keydown");
      });
    }).not.toThrow();

    // A missing key normalizes to "", not "e", so the tip stays active.
    expect(useShortcutTipsStore.getState().activeTipId).toBe("edit-sequence");
  });
});
