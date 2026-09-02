import { act, render, screen } from "@testing-library/react";
import { PointerHint } from "@web/components/PointerHint/PointerHint";
import {
  initialShortcutShowcaseState,
  shortcutShowcaseActions,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { welcomeGuideActions } from "@web/components/WelcomeModal/welcome.guide.store";
import { POINTER_ACTIONS } from "@web/shortcuts/keyboard-only/pointer-action";
import {
  initialPointerBlockState,
  pointerBlockActions,
  usePointerBlockStore,
} from "@web/shortcuts/keyboard-only/pointer-block.store";
import { KEYMAP } from "@web/shortcuts/keymap";
import {
  eventJumpActions,
  initialEventJumpState,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const HINT_COUNT_KEY = "compass.pointer-hint-count";

describe("PointerHint", () => {
  beforeEach(() => {
    usePointerBlockStore.setState(initialPointerBlockState, true);
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState, true);
    useEventJumpStore.setState(initialEventJumpState, true);
    welcomeGuideActions.setFirstVisitOpen(false);
    welcomeGuideActions.close();
    sessionStorage.removeItem(HINT_COUNT_KEY);
  });

  afterEach(() => {
    usePointerBlockStore.setState(initialPointerBlockState, true);
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState, true);
    useEventJumpStore.setState(initialEventJumpState, true);
    welcomeGuideActions.setFirstVisitOpen(false);
    welcomeGuideActions.close();
    sessionStorage.removeItem(HINT_COUNT_KEY);
  });

  it("stays hidden until a click is blocked, then teaches", () => {
    render(<PointerHint />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Compass is keyboard only. Press ? for shortcuts.",
    );
  });

  it("omits the legend hint while the welcome modal is open", () => {
    welcomeGuideActions.setFirstVisitOpen(true);
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Use the keys on this screen.",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("Press");
  });

  it("omits the legend hint while the welcome guide is open", () => {
    welcomeGuideActions.open();
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Use the keys on this screen.",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("Press");
  });

  it("teaches the start-trial shortcut for the banner CTA", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.startTrial,
        shortcutKey: "S",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press S to start your trial.",
    );
  });

  it("teaches the reconnect shortcut for the banner CTA", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.reconnectGoogle,
        shortcutKey: "G",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press G to reconnect Google Calendar.",
    );
  });

  it("teaches Escape for the up-next banner dismiss control", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.upNextDismiss,
        shortcutKey: "Esc",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press Esc to dismiss.",
    );
  });

  it("teaches a bound shortcut key outside the welcome modal", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "unknown",
        shortcutKey: "S",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Press S");
  });

  it("teaches a chord shortcut as separate keycaps", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "unknown",
        shortcutKey: ["Mod", "K"],
      });
    });

    const hint = screen.getByRole("status");
    expect(hint).toHaveTextContent("Press");
    expect(hint).toHaveTextContent("K");
  });

  it("teaches the matching welcome shortcut for the attempted control", () => {
    welcomeGuideActions.setFirstVisitOpen(true);
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "unknown",
        shortcutKey: "1",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Press 1");
  });

  it("keeps the welcome shortcut sentence after the session reminder threshold", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    welcomeGuideActions.setFirstVisitOpen(true);
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "unknown",
        shortcutKey: "U",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Press U");
  });

  it("points at the on-screen keys while the showcase is active", () => {
    shortcutShowcaseActions.replay();
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Keyboard only. Follow the keys on screen.",
    );
  });

  it("teaches the sidebar shortcut for the attempted action", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.sidebarClose,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press ] to close the sidebar.",
    );
  });

  it("teaches the today shortcut for the month picker today control", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.goToToday,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press T to go to today.",
    );
  });

  it("teaches view shortcuts for the date heading", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.switchView,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press W, D, or L to switch views.",
    );
  });

  it("teaches the assigned sequence for the attempted event", () => {
    render(<PointerHint />);

    act(() => {
      eventJumpActions.setPointerHint({ eventId: "event-1", key: "W2" });
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.eventOpen,
        eventId: "event-1",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press W2, then Enter to open this event.",
    );
  });

  it("teaches the event-jump key when no sequence is assigned yet", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.eventOpen,
        eventId: "event-1",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      `Press ${KEYMAP.eventJump.keycaps.join("")} to reveal event shortcuts.`,
    );
  });

  it("shortens to a brief pulse after a few reminders in the session", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Keyboard only.");
    expect(screen.getByRole("status")).not.toHaveTextContent("Press");
  });

  it("keeps the contextual sentence after the session reminder threshold", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.sidebarClose,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press ] to close the sidebar.",
    );
  });

  it("keeps the today shortcut sentence after the session reminder threshold", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.goToToday,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press T to go to today.",
    );
  });

  it("keeps the view-switch sentence after the session reminder threshold", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.switchView,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press W, D, or L to switch views.",
    );
  });

  it("keeps the up-next dismiss sentence after the session reminder threshold", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: POINTER_ACTIONS.upNextDismiss,
        shortcutKey: "Esc",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press Esc to dismiss.",
    );
  });

  it("names the quarter-hour an empty timed-grid click aimed at", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "grid.timed",
        gridDate: "2026-08-29",
        gridTimeKey: "1130",
        gridTimeLabel: "11:30 AM",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Type 1130 to create an event at 11:30 AM.",
    );
  });

  it("names an evening quarter-hour in 24-hour digits", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "grid.timed",
        gridDate: "2026-08-29",
        gridTimeKey: "1830",
        gridTimeLabel: "6:30 PM",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Type 1830 to create an event at 6:30 PM.",
    );
  });

  it("keeps the timed-grid shortcut sentence after the session reminder threshold", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "grid.timed",
        gridDate: "2026-08-29",
        gridTimeKey: "1200",
        gridTimeLabel: "12:00 PM",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Type 1200 to create an event at 12:00 PM.",
    );
  });

  it("teaches Shift+C for a click on the all-day row", () => {
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick({
        actionId: "grid.all-day",
        gridDate: "2026-08-29",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press Shift+C to create an all-day event here.",
    );
  });
});
