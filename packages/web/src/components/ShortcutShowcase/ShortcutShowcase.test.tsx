import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("teaches create then save, and graduates on Enter", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());
    expect(currentStepId()).toBe("create");

    // create: C opens a draft with its title editor.
    pressKey("c");
    expect(currentStepId()).toBe("save");

    // save: type a title into the editor, Enter commits.
    await user.type(
      screen.getByLabelText("Event title"),
      "Coffee with Alex{Enter}",
    );
    expect(currentStepId()).toBe("graduation");
    expect(screen.getByText("Coffee with Alex")).toBeTruthy();
    expect(screen.getByText(/young cap'n/)).toBeTruthy();

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

  it("keeps answering the shortcuts it no longer gates the exit on", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    // S flashes the day-prefix chips, typing one jumps, and none of it
    // advances a lesson any more.
    pressKey("s");
    pressKey("t");
    pressKey("1");
    expect(currentStepId()).toBe("create");

    // e then t opens a title editor on a board no lesson seated focus on.
    pressKey("e");
    pressKey("t");
    expect(screen.getByLabelText("Event title")).toBeTruthy();
    expect(currentStepId()).toBe("create");
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

  it("offers 'Do it for me' from the first step, and swaps it out at graduation", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    // No idle wait or failed attempt required: the way out is always offered.
    await user.click(screen.getByRole("button", { name: "Do it for me" }));
    expect(currentStepId()).toBe("save");

    showStep("graduation");
    expect(screen.queryByRole("button", { name: "Do it for me" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enter Compass" })).toBeTruthy();
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

  it("Previous restores the prior step's board so it can be redone", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("c");
    expect(currentStepId()).toBe("save");
    expect(screen.getByLabelText("Event title")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(currentStepId()).toBe("create");
    // The board rewound with the step: the draft is gone, C works again.
    expect(screen.queryByLabelText("Event title")).toBeNull();
    pressKey("c");
    expect(currentStepId()).toBe("save");
  });

  it("Escape inside the title editor closes the editor, not the showcase", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.replay());

    pressKey("c");
    expect(currentStepId()).toBe("save");

    await user.type(screen.getByLabelText("Event title"), "Standup prep");
    pressKey("Escape");
    // Editor committed and closed; the showcase is still running.
    expect(screen.queryByLabelText("Event title")).toBeNull();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(screen.getByText("Standup prep")).toBeTruthy();

    // With no editor open, Escape now leaves.
    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });
});
