import { act, render, screen } from "@testing-library/react";
import { PointerHint } from "@web/components/PointerHint/PointerHint";
import {
  initialShortcutShowcaseState,
  shortcutShowcaseActions,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import {
  initialPointerBlockState,
  pointerBlockActions,
  usePointerBlockStore,
} from "@web/shortcuts/keyboard-only/pointer-block.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const HINT_COUNT_KEY = "compass.pointer-hint-count";

describe("PointerHint", () => {
  beforeEach(() => {
    usePointerBlockStore.setState(initialPointerBlockState, true);
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState, true);
    sessionStorage.removeItem(HINT_COUNT_KEY);
  });

  afterEach(() => {
    usePointerBlockStore.setState(initialPointerBlockState, true);
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState, true);
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

  it("shortens to a brief pulse after a few reminders in the session", () => {
    sessionStorage.setItem(HINT_COUNT_KEY, "3");
    render(<PointerHint />);

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Keyboard only.");
    expect(screen.getByRole("status")).not.toHaveTextContent("Press");
  });
});
