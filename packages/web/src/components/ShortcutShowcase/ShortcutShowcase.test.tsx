import { resolveModifier } from "@tanstack/react-hotkeys";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestNotificationPort } from "@web/__tests__/helpers/web-test-seams";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { RUN_TASKS } from "@web/components/ShortcutShowcase/game.tasks";
import { ShortcutShowcase } from "@web/components/ShortcutShowcase/ShortcutShowcase";
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
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });
};

const modInit = () =>
  resolveModifier("Mod") === "Meta" ? { metaKey: true } : { ctrlKey: true };

const typeDigits = (digits: string) => {
  for (const digit of digits) pressKey(digit);
};

/** Starts the clock from the how-to card and clears the whole queue. */
const playWinningRun = () => {
  pressKey("Enter");
  // place-standup
  pressKey("c");
  pressKey("ArrowLeft");
  pressKey("Enter");
  // quicktime-lunch
  typeDigits("1230");
  pressKey("Enter");
  // place-review
  pressKey("c");
  pressKey("ArrowRight");
  pressKey("ArrowRight");
  pressKey("Enter");
  // nudge-standup
  for (let i = 0; i < 4; i += 1) pressKey("ArrowDown", { shiftKey: true });
  // resize-one-on-one
  pressKey("Tab");
  pressKey("Tab");
  pressKey("ArrowDown", { shiftKey: true });
  pressKey("ArrowDown", { shiftKey: true });
  // quicktime-focus
  typeDigits("1600");
  pressKey("Enter");
  // delete-gym, undo-gym
  pressKey("Delete");
  pressKey("z", modInit());
  // nudge-review
  pressKey("ArrowLeft", { shiftKey: true });
  // place-party
  pressKey("c");
  for (let i = 0; i < 4; i += 1) pressKey("ArrowDown");
  pressKey("Enter");
};

describe("ShortcutShowcase", () => {
  beforeEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "");
    persistentBrowserStore.remove(STORAGE_KEYS.SHORTCUT_SHOWCASE_STEP);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "");
    localStorage.setItem("compass.onboarding.has-seen-onboarding-tour", "");
    clearAppLockReasons();
  });

  // Shared singletons: leave nothing active for later suites in the process.
  afterEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    clearAppLockReasons();
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

  it("focuses the first control and keeps Tab inside the takeover", async () => {
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

    const first = screen.getByRole("button", { name: "Start the clock" });
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(outside).not.toHaveFocus();
    expect(first).not.toHaveFocus();

    await user.tab();
    expect(first).toHaveFocus();
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

  it("shows the how-to card, and Enter starts the clock on task 1", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.startFromWelcome());

    expect(screen.getByText("Schedule Rush")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Start the clock" }),
    ).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();

    // Game keys do nothing before the clock starts.
    pressKey("c");
    expect(screen.queryByRole("timer")).toBeNull();

    pressKey("Enter");
    expect(screen.getByRole("timer")).toBeTruthy();
    expect(screen.getByText(`Task 1/${RUN_TASKS.length}`)).toBeTruthy();
    expect(screen.getByText("Standup")).toBeTruthy();
  });

  it("clears the queue with the taught keys and reaches the end screen", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.startFromWelcome());

    playWinningRun();

    expect(screen.getByText("You cleared the week!")).toBeTruthy();
    expect(
      screen.getByText(`${RUN_TASKS.length}/${RUN_TASKS.length} tasks cleared`),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Sign up to keep your calendar/ }),
    ).toBeTruthy();
    // The run finished, but nothing is marked seen until the user leaves.
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
  });

  it("graduates from the end screen and fades out before unmounting", async () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.startFromWelcome());
    playWinningRun();

    // O opens the calendar for anonymous players (Enter belongs to signup).
    pressKey("o");
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
      act(() => shortcutShowcaseActions.startFromWelcome());
      playWinningRun();
      pressKey("o");
      await waitFor(() => {
        expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
      });
      expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("Enter on the end screen hands an anonymous player to signup", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.startFromWelcome());
    playWinningRun();

    pressKey("Enter");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
  });

  it("replays from the end screen with a fresh board and score", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.startFromWelcome());
    playWinningRun();
    expect(screen.getByText("You cleared the week!")).toBeTruthy();

    pressKey("p");
    expect(screen.getByRole("timer")).toBeTruthy();
    expect(screen.getByText(`Task 1/${RUN_TASKS.length}`)).toBeTruthy();
    expect(
      screen.getByText("0", { selector: "[data-game-score]" }),
    ).toBeTruthy();
  });

  it("does not treat S as skip-to-signup; U leaves for signup mid-run", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    pressKey("Enter");

    pressKey("s");
    pressKey("d");
    pressKey("x");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    pressKey("u");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("Escape arms a confirm, then a second Escape leaves", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(true);
    expect(screen.getByText("Press Esc again to leave practice.")).toBeTruthy();

    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("a game keystroke cancels a pending skip", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    pressKey("Enter");

    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(true);

    pressKey("c");
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(false);
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
  });

  it("swallows the palette and legend triggers during the game", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    pressKey("Enter");

    pressKey("k", modInit());
    pressKey("?", { shiftKey: true });
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(screen.getByRole("timer")).toBeTruthy();
  });

  it("re-offers an unfinished attempt from the how-to card after reload", () => {
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
    // Legacy lesson step ids from before the game shipped count too.
    persistentBrowserStore.set(
      STORAGE_KEYS.SHORTCUT_SHOWCASE_STEP,
      "eventJump",
    );

    render(<ShortcutShowcase />);

    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(
      screen.getByRole("button", { name: "Start the clock" }),
    ).toBeTruthy();
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
  });

  it("places the practice sidebar after the grid, matching the real calendar", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    const monday = screen.getByText("Mon");
    const upNext = screen.getByText("Up next", { selector: "div" });
    expect(
      monday.compareDocumentPosition(upNext) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  describe("the reminders offer on the end screen", () => {
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

    it("asks the browser once, even when pressed twice", async () => {
      const user = userEvent.setup();
      const seam = installPort({ respondWith: "granted" });
      render(<ShortcutShowcase />);
      act(() => shortcutShowcaseActions.replay());
      playWinningRun();

      const button = screen.getByRole("button", { name: /Enable reminders/ });
      await user.click(button);
      await user.click(button);

      await waitFor(() => {
        expect(seam.mocks.requestPermission).toHaveBeenCalledTimes(1);
      });
      // The end screen stays put: enabling reminders is not an exit.
      expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
      expect(screen.getByText("You cleared the week!")).toBeTruthy();
    });

    it("offers no reminders button where the API is missing", () => {
      installPort({ supported: false });
      render(<ShortcutShowcase />);
      act(() => shortcutShowcaseActions.replay());
      playWinningRun();

      expect(
        screen.queryByRole("button", { name: /Enable reminders/ }),
      ).toBeNull();
    });
  });
});
