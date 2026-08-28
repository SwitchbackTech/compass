import { act, renderHook } from "@testing-library/react";
import {
  initialFirstEventPromptState,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { draftActions } from "@web/events/stores/draft.store";
import { CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES } from "@web/grid/interaction/view-event-registry";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import { getHintPlainText } from "@web/shortcuts/tips/shortcut-tips.data";
import {
  resetShortcutHintProgressStoreForTests,
  shortcutHintProgressActions,
} from "@web/shortcuts/tips/shortcut-tips.progress.store";
import { useShortcutHintContext } from "@web/shortcuts/tips/useShortcutHintContext";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const focusCalendarEvent = () => {
  const card = document.createElement("div");
  card.setAttribute(CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES[0], "evt-1");
  card.tabIndex = -1;
  document.body.appendChild(card);
  card.focus();
  return card;
};

describe("useShortcutHintContext", () => {
  beforeEach(() => {
    draftActions.discard();
    useFirstEventPromptStore.setState(initialFirstEventPromptState, true);
  });

  afterEach(() => {
    draftActions.discard();
    useFirstEventPromptStore.setState(initialFirstEventPromptState, true);
    eventJumpActions.reset();
    resetShortcutHintProgressStoreForTests();
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  it("returns create-event on an idle calendar before the first real event", () => {
    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("create-event");
  });

  it("switches to first-event-save when the form opens", () => {
    const { result } = renderHook(() => useShortcutHintContext());

    act(() => {
      draftActions.startGridDraft({
        activity: "createShortcut",
        draft: createGridEventDraft(
          timedGridSchedule(
            new Date("2026-05-20T09:00:00.000"),
            new Date("2026-05-20T10:00:00.000"),
          ),
        ),
      });
      draftActions.setFormOpen(true);
    });

    expect(result.current.id).toBe("first-event-save");
  });

  it("returns page-jump once the first event is done and the calendar is idle", () => {
    useFirstEventPromptStore.setState({ isDone: true }, false);
    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("page-jump");
  });

  it("returns edit-sequence when a calendar event is focused", () => {
    focusCalendarEvent();
    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("edit-sequence");
  });

  it("returns life-this-week on the Life path", () => {
    window.history.replaceState({}, "", "/life");
    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("life-this-week");
  });

  it("advances to event-jump after hold-Mod is demonstrated", () => {
    useFirstEventPromptStore.setState({ isDone: true }, false);
    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("page-jump");

    act(() => shortcutHintProgressActions.demonstrate("page-jump"));

    expect(result.current.id).toBe("event-jump");
  });

  it("teaches week-column letters on /week after event jump is demonstrated", () => {
    window.history.replaceState({}, "", "/week");
    useFirstEventPromptStore.setState({ isDone: true }, false);
    act(() => {
      shortcutHintProgressActions.demonstrate("page-jump");
      shortcutHintProgressActions.demonstrate("event-jump");
      // Exactly one jumpable column, so the assertion does not depend on
      // which weekday the suite runs on.
      eventJumpActions.setJumpableDayPrefixes(["w"]);
    });

    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("week-day-focus");
    expect(getHintPlainText(result.current)).toBe("Shift+W jumps to Wednesday");
  });

  it("falls through the column tip when no day has a jump key", () => {
    window.history.replaceState({}, "", "/week");
    useFirstEventPromptStore.setState({ isDone: true }, false);
    act(() => {
      shortcutHintProgressActions.demonstrate("page-jump");
      shortcutHintProgressActions.demonstrate("event-jump");
      eventJumpActions.setJumpableDayPrefixes([]);
    });

    const { result } = renderHook(() => useShortcutHintContext());
    expect(result.current.id).toBe("command-palette");
  });
});
