import { act, render, screen, waitFor } from "@testing-library/react";
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

  it("teaches create as one motion, and graduates on Enter", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    expect(currentStepId()).toBe("create");
    expect(screen.getByText("Press C to start a new event.")).toBeTruthy();

    // C opens a draft with its title editor; the lesson stays on "create"
    // and the hint swaps rather than advancing to a second step.
    pressKey("c");
    expect(currentStepId()).toBe("create");
    expect(screen.getByText(/Type a title, then press Enter/)).toBeTruthy();

    // Typing a title and pressing Enter commits it and advances.
    await user.type(
      screen.getByLabelText("Event title"),
      "Coffee with Alex{Enter}",
    );
    expect(screen.getByText("Coffee with Alex")).toBeTruthy();

    // The notifications offer sits between the lesson and the exit. N passes.
    expect(currentStepId()).toBe("notifications");
    pressKey("n");

    expect(currentStepId()).toBe("graduation");
    expect(screen.getByText(/young cap'n/)).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Enter Compass/ }),
      ).toHaveFocus();
    });

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
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
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

  it("'Do it for me' performs the whole lesson and lands on graduation", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside calendar</button>
        <ShortcutShowcase />
      </>,
    );
    const outside = screen.getByRole("button", { name: "Outside calendar" });
    act(() => shortcutShowcaseActions.replay());

    // No idle wait or failed attempt required: the way out is always offered.
    await user.click(screen.getByRole("button", { name: "Do it for me" }));
    expect(currentStepId()).toBe("notifications");
    expect(screen.queryByRole("button", { name: "Do it for me" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Not now/ }));
    expect(currentStepId()).toBe("graduation");
    const enterCompass = screen.getByRole("button", { name: "Enter Compass" });
    await waitFor(() => {
      expect(enterCompass).toHaveFocus();
    });

    await user.tab({ shift: true });
    expect(outside).not.toHaveFocus();
    await user.tab();
    expect(enterCompass).toHaveFocus();
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
      screen.getByRole("button", { name: /Skip to calendar/ }).focus();
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

      // D and S belong to buttons this step does not render; C drives a
      // practice board this step is no longer teaching.
      await user.keyboard("d");
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

    it("still offers the door out to the calendar", () => {
      installPort();
      render(<ShortcutShowcase />);
      showStep("notifications");

      pressKey("x");
      expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    });
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
