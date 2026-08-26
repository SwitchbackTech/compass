import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestNotificationPort } from "@web/__tests__/helpers/web-test-seams";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { ShortcutShowcase } from "@web/components/ShortcutShowcase/ShortcutShowcase";
import {
  SHOWCASE_STEP_IDS,
  type ShowcaseStepId,
} from "@web/components/ShortcutShowcase/showcase.steps";
import {
  initialShortcutShowcaseState,
  shortcutShowcaseActions,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { registerNotificationPort } from "@web/notifications/notification.port";
import { resetNotificationStoreForTests } from "@web/notifications/notification.store";
import { clearAppLockReasons, isAppLocked } from "@web/shortcuts/app-lock";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const pressKey = (key: string, init: KeyboardEventInit = {}) => {
  act(() => {
    screen
      .getByLabelText("Shortcut practice")
      .dispatchEvent(
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

    const first = screen.getByRole("button", { name: /Skip to sign up/ });
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

  it("teaches create as one motion, then continues to the next level", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    expect(currentStepId()).toBe("create");
    expect(screen.getByText("Press C to start a new event.")).toBeTruthy();
    expect(screen.getByText("Level 1/6")).toBeTruthy();

    pressKey("c");
    expect(currentStepId()).toBe("create");
    expect(screen.getByText(/Type a title, then press Enter/)).toBeTruthy();

    await user.type(
      screen.getByLabelText("Event title"),
      "Coffee with Alex{Enter}",
    );
    expect(currentStepId()).toBe("pageJump");
    expect(screen.getByText("Coffee with Alex")).toBeTruthy();
    expect(screen.getByText("Level 2/6")).toBeTruthy();
    expect(
      screen.getByText("See where to go: reveal the jump keys"),
    ).toBeTruthy();
  });

  it("graduates on Enter from the graduation step", async () => {
    render(<ShortcutShowcase />);
    showStep("graduation");
    expect(screen.getByText(/you've got this/)).toBeTruthy();

    const seeCalendar = screen.getByRole("button", {
      name: "See your calendar",
    });
    expect(within(seeCalendar).queryByText("Enter")).toBeNull();

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

  it("fades the takeover on See your calendar, then unmounts", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    showStep("graduation");

    await user.click(screen.getByRole("button", { name: "See your calendar" }));
    expect(screen.getByLabelText("Shortcut practice")).toHaveAttribute(
      "data-closing",
    );
    expect(
      screen.getByRole("button", { name: "See your calendar" }),
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

  it("does not treat S as skip-to-signup; U leaves for signup", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("s");
    pressKey("d");
    pressKey("x");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(currentStepId()).toBe("create");

    pressKey("u");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("does not leave graduation when U is pressed", () => {
    render(<ShortcutShowcase />);
    showStep("graduation");

    pressKey("u");

    expect(currentStepId()).toBe("graduation");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
  });

  it("advances the hold-Mod level after revealing jump keys", () => {
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
    // The last level hands off to the notifications offer, then graduation.
    expect(currentStepId()).toBe("notifications");
  });

  it("does not open the practice palette on Mod+K before the palette level", () => {
    const isMac = resolveModifier("Mod") === "Meta";
    render(<ShortcutShowcase />);
    showStep("create");

    pressKey("k", isMac ? { metaKey: true } : { ctrlKey: true });
    expect(screen.queryByLabelText("Practice command palette")).toBeNull();
    expect(currentStepId()).toBe("create");
  });

  it("Escape closes the practice palette and stays on the palette level", () => {
    const isMac = resolveModifier("Mod") === "Meta";
    render(<ShortcutShowcase />);
    showStep("palette");

    pressKey("k", isMac ? { metaKey: true } : { ctrlKey: true });
    expect(screen.getByLabelText("Practice command palette")).toBeTruthy();

    pressKey("Escape");
    expect(screen.queryByLabelText("Practice command palette")).toBeNull();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(currentStepId()).toBe("palette");
    expect(screen.getByText("When you forget, ask the palette")).toBeTruthy();
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

  it("Skip leaves straight away, without a confirm", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    await user.click(screen.getByRole("button", { name: /^Skip$/ }));
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

  describe("the notifications offer", () => {
    const installPort = (
      options?: Parameters<typeof createTestNotificationPort>[0],
    ) => {
      const seam = createTestNotificationPort(options);
      registerNotificationPort(seam.port);
      act(() => {
        resetNotificationStoreForTests();
      });
      return seam;
    };

    it("asks the browser, then moves on once permission is granted", async () => {
      const user = userEvent.setup();
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      await user.click(
        screen.getByRole("button", { name: /Enable notifications/ }),
      );

      expect(seam.mocks.requestPermission).toHaveBeenCalled();
      await waitFor(() => {
        expect(currentStepId()).toBe("graduation");
      });
    });

    it("moves on even when the browser blocks the request", async () => {
      const user = userEvent.setup();
      installPort({ respondWith: "denied" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      await user.click(
        screen.getByRole("button", { name: /Enable notifications/ }),
      );

      // A toast explains the block. Holding the user here would turn a
      // one-key offer into a decision they cannot undo from this screen.
      await waitFor(() => {
        expect(currentStepId()).toBe("graduation");
      });
    });

    it("takes the offer from the keyboard with Enter", async () => {
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      pressKey("Enter");

      expect(seam.mocks.requestPermission).toHaveBeenCalled();
      await waitFor(() => {
        expect(currentStepId()).toBe("graduation");
      });
    });

    it("asks once, and lands on graduation, when Enter is pressed twice", async () => {
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      // The step does not change until the prompt resolves, so both presses
      // land on the offer. Advancing twice would skip graduation entirely.
      pressKey("Enter");
      pressKey("Enter");

      await waitFor(() => {
        expect(currentStepId()).toBe("graduation");
      });
      expect(seam.mocks.requestPermission).toHaveBeenCalledTimes(1);
      expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    });

    it("does not double-advance when the offer is passed mid-prompt", async () => {
      installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      pressKey("Enter");
      pressKey("n");

      await waitFor(() => {
        expect(currentStepId()).toBe("graduation");
      });
      // Still on graduation, not finished out from under the user.
      expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    });

    it("lets Enter activate whichever button has focus", async () => {
      const user = userEvent.setup();
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      // Enter is the step's shortcut, but a focused button owns it first:
      // asking to leave must not raise a permission prompt instead.
      screen.getByRole("button", { name: /^Skip$/ }).focus();
      await user.keyboard("{Enter}");

      expect(seam.mocks.requestPermission).not.toHaveBeenCalled();
      expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    });

    it("does not raise the prompt from a held Enter carried in from typing", () => {
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      // Auto-repeat from the Enter that committed the practice title lands
      // here once the editor unmounts.
      pressKey("Enter", { repeat: true });

      expect(seam.mocks.requestPermission).not.toHaveBeenCalled();
      expect(currentStepId()).toBe("notifications");
    });

    it("'Not now' passes without ever prompting", async () => {
      const user = userEvent.setup();
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      showStep("notifications");

      await user.click(screen.getByRole("button", { name: /Not now/ }));

      expect(seam.mocks.requestPermission).not.toHaveBeenCalled();
      expect(currentStepId()).toBe("graduation");
    });

    it("leaves the practice keys behind on the create lesson", async () => {
      const user = userEvent.setup();
      installPort();
      render(<ShortcutShowcase />);
      showStep("notifications");

      // U belongs to a button this step does not render; C drives a
      // practice board this step is not teaching.
      await user.keyboard("d");
      await user.keyboard("u");
      await user.keyboard("c");
      expect(currentStepId()).toBe("notifications");
      expect(screen.queryByLabelText("Event title")).toBeNull();
    });

    it("says so, and still lets the user pass, where the API is missing", () => {
      installPort({ supported: false });
      render(<ShortcutShowcase />);
      showStep("notifications");

      expect(screen.getByText("Not supported in this browser")).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: /Enable notifications/ }),
      ).toBeNull();

      pressKey("n");
      expect(currentStepId()).toBe("graduation");
    });

    it("carries no level chip, because it teaches no key", () => {
      installPort();
      render(<ShortcutShowcase />);
      showStep("notifications");

      expect(screen.queryByText(/^Level \d+\/\d+$/)).toBeNull();
    });

    it("still offers the door out to the calendar", () => {
      installPort();
      render(<ShortcutShowcase />);
      showStep("notifications");

      pressKey("Escape");
      expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    });
  });
});
