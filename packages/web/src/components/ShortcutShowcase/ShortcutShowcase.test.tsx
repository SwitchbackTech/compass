import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { ShortcutShowcase } from "@web/components/ShortcutShowcase/ShortcutShowcase";
import {
  SHOWCASE_MISSION_IDS,
  SHOWCASE_STEP_IDS,
  type ShowcaseStepId,
} from "@web/components/ShortcutShowcase/showcase.steps";
import {
  initialShortcutShowcaseState,
  shortcutShowcaseActions,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { clearAppLockReasons, isAppLocked } from "@web/shortcuts/app-lock";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const pressKey = (key: string, init: KeyboardEventInit = {}) => {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
    );
  });
};

const currentStepId = () =>
  SHOWCASE_STEP_IDS[useShortcutShowcaseStore.getState().stepIndex];

/** Jumps straight to a lesson; there is no store action for an arbitrary step. */
const showStep = (id: ShowcaseStepId) => {
  act(() =>
    useShortcutShowcaseStore.setState({
      isActive: true,
      stepIndex: SHOWCASE_STEP_IDS.indexOf(id),
    }),
  );
};

describe("ShortcutShowcase", () => {
  beforeEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "");
    localStorage.setItem("compass.onboarding.has-seen-onboarding-tour", "");
    clearAppLockReasons();
  });

  // Shared singletons: leave nothing active for later suites in the process.
  afterEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    clearAppLockReasons();
  });

  it("focuses the first practice control and keeps Tab inside the takeover", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside calendar</button>
        <ShortcutShowcase />
      </>,
    );
    const outside = screen.getByRole("button", { name: "Outside calendar" });
    outside.focus();

    act(() => shortcutShowcaseActions.replay());

    const first = screen.getByRole("button", { name: /Do it for me/ });
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(outside).not.toHaveFocus();
    expect(first).not.toHaveFocus();

    await user.tab();
    expect(first).toHaveFocus();
  });

  it("renders nothing until started, then locks the app while up", () => {
    render(<ShortcutShowcase />);
    expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
    expect(isAppLocked()).toBe(false);

    act(() => shortcutShowcaseActions.replay());
    expect(screen.getByLabelText("Shortcut practice")).toBeTruthy();
    expect(isAppLocked()).toBe(true);

    act(() => shortcutShowcaseActions.skip());
    expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
    expect(isAppLocked()).toBe(false);
  });

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    expect(() => {
      act(() => {
        dispatchMissingKey("keydown");
      });
    }).not.toThrow();

    expect(screen.getByLabelText("Shortcut practice")).toBeTruthy();
  });

  it("teaches create as one motion, then continues to the next mission", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    expect(currentStepId()).toBe("create");
    expect(screen.getByText("Press C to start a new event.")).toBeTruthy();
    expect(screen.getByText("Mission 1 of 6")).toBeTruthy();

    pressKey("c");
    expect(currentStepId()).toBe("create");
    expect(screen.getByText(/Type a title, then press Enter/)).toBeTruthy();

    await user.type(
      screen.getByLabelText("Event title"),
      "Coffee with Alex{Enter}",
    );
    expect(currentStepId()).toBe("pageJump");
    expect(screen.getByText("Coffee with Alex")).toBeTruthy();
    expect(screen.getByText("Mission 2 of 6")).toBeTruthy();
  });

  it("graduates on Enter from the graduation step", async () => {
    render(<ShortcutShowcase />);
    showStep("graduation");
    expect(screen.getByText(/young cap'n/)).toBeTruthy();

    const enterCompass = screen.getByRole("button", { name: "Enter Compass" });
    expect(within(enterCompass).queryByText("Enter")).toBeNull();

    pressKey("Enter");
    expect(screen.getByLabelText("Shortcut practice")).toHaveAttribute(
      "data-closing",
    );
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");

    await waitFor(
      () => {
        expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
      },
      { timeout: 2000 },
    );
    expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
  });

  it("fades the takeover on Enter Compass, then unmounts", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    showStep("graduation");

    await user.click(screen.getByRole("button", { name: "Enter Compass" }));
    expect(screen.getByLabelText("Shortcut practice")).toHaveAttribute(
      "data-closing",
    );
    expect(
      screen.getByRole("button", { name: "Enter Compass" }),
    ).toBeDisabled();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    pressKey("Enter");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    await waitFor(
      () => {
        expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
      },
      { timeout: 2000 },
    );
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("graduates immediately when reduced motion is preferred", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    try {
      render(<ShortcutShowcase />);
      showStep("graduation");
      pressKey("Enter");
      await waitFor(() => {
        expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
      });
      expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("'Do it for me' advances one mission at a time through graduation", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside calendar</button>
        <ShortcutShowcase />
      </>,
    );
    const outside = screen.getByRole("button", { name: "Outside calendar" });
    act(() => shortcutShowcaseActions.replay());

    for (let i = 0; i < SHOWCASE_MISSION_IDS.length; i += 1) {
      expect(currentStepId()).toBe(SHOWCASE_MISSION_IDS[i]);
      await user.click(screen.getByRole("button", { name: "Do it for me" }));
    }

    expect(currentStepId()).toBe("graduation");
    expect(screen.queryByRole("button", { name: "Do it for me" })).toBeNull();
    const enterCompass = screen.getByRole("button", { name: "Enter Compass" });
    await waitFor(() => {
      expect(enterCompass).toHaveFocus();
    });

    await user.tab({ shift: true });
    expect(outside).not.toHaveFocus();
    await user.tab();
    expect(enterCompass).toHaveFocus();
  });

  it("does not treat S as skip-to-signup; U leaves for signup", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("s");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(currentStepId()).toBe("create");

    pressKey("u");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("advances the hold-Mod mission after revealing jump keys", () => {
    const modKey = resolveModifier("Mod") === "Meta" ? "Meta" : "Control";
    render(<ShortcutShowcase />);
    showStep("pageJump");

    pressKey(modKey);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    pressKey("1", { code: "Digit1" });
    expect(currentStepId()).toBe("eventJump");
  });

  it("teaches S then a letter to land on an event", () => {
    render(<ShortcutShowcase />);
    showStep("eventJump");

    pressKey("s");
    expect(screen.getByText("F")).toBeTruthy();

    pressKey("f");
    expect(currentStepId()).toBe("nudge");
  });

  it("teaches Shift+arrow to nudge the focused event", () => {
    render(<ShortcutShowcase />);
    showStep("nudge");

    pressKey("ArrowRight", { shiftKey: true });
    expect(currentStepId()).toBe("editTitle");
  });

  it("teaches E then T to target the title", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    showStep("editTitle");

    pressKey("e");
    pressKey("t");
    expect(currentStepId()).toBe("editTitle");
    expect(screen.getByLabelText("Event title")).toBeTruthy();

    await user.type(screen.getByLabelText("Event title"), "{Enter}");
    expect(currentStepId()).toBe("palette");
  });

  it("opens a practice palette with Mod+K and completes on Enter", () => {
    const isMac = resolveModifier("Mod") === "Meta";
    render(<ShortcutShowcase />);
    showStep("palette");

    pressKey("k", isMac ? { metaKey: true } : { ctrlKey: true });
    expect(screen.getByLabelText("Practice command palette")).toBeTruthy();

    pressKey("Enter");
    expect(currentStepId()).toBe("graduation");
  });

  it("offers 'Skip to sign up' from the first step and leaves on the first click", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    expect(currentStepId()).toBe("create");

    // No confirm in the way, and no lesson to finish first.
    await user.click(screen.getByRole("button", { name: "Skip to sign up" }));
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
  });

  it("Skip to calendar leaves straight away, without a confirm", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    await user.click(screen.getByRole("button", { name: "Skip to calendar" }));
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
  });

  it("Escape skips the showcase outright", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("Escape inside the title editor closes the editor, not the showcase", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("c");
    expect(currentStepId()).toBe("create");

    await user.type(screen.getByLabelText("Event title"), "Standup prep");
    pressKey("Escape");
    // Editor committed and closed; the showcase is still running, and the
    // lesson hasn't advanced (only a title commit advances it).
    expect(screen.queryByLabelText("Event title")).toBeNull();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(currentStepId()).toBe("create");
    expect(screen.getByText("Standup prep")).toBeTruthy();

    // C works again, reopening the editor for another try.
    pressKey("c");
    expect(screen.getByLabelText("Event title")).toBeTruthy();

    // With no editor open, Escape now leaves.
    pressKey("Escape");
    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });
});
