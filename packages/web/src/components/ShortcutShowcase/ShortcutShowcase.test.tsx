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

    act(() => shortcutShowcaseActions.start());
    expect(screen.getByLabelText("Shortcut practice")).toBeTruthy();
    expect(isAppLocked()).toBe(true);

    act(() => shortcutShowcaseActions.skip());
    expect(screen.queryByLabelText("Shortcut practice")).toBeNull();
    expect(isAppLocked()).toBe(false);
  });

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.start());

    expect(() => {
      act(() => {
        dispatchMissingKey("keydown");
      });
    }).not.toThrow();

    expect(screen.getByLabelText("Shortcut practice")).toBeTruthy();
  });

  it("advances through every lesson by doing, and graduates on Enter", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.start());

    // create: C opens a draft with its title editor.
    pressKey("c");
    expect(currentStepId()).toBe("save");

    // save: type a title into the editor, Enter commits.
    await user.type(
      screen.getByLabelText("Event title"),
      "Coffee with Alex{Enter}",
    );
    expect(currentStepId()).toBe("moveFocus");
    expect(screen.getByText("Coffee with Alex")).toBeTruthy();

    // moveFocus: an arrow that lands on a different block advances.
    pressKey("ArrowLeft");
    expect(currentStepId()).toBe("editTitle");

    // editTitle: e then t opens the focused block's title editor.
    pressKey("e");
    pressKey("t");
    expect(currentStepId()).toBe("eventJump");

    // eventJump: S flashes the real day-prefix chips; typing one jumps.
    pressKey("s");
    pressKey("t");
    pressKey("1");
    expect(currentStepId()).toBe("moveEvent");

    // moveEvent: Shift+Arrow slides the focused block.
    pressKey("ArrowDown", { shiftKey: true });
    expect(currentStepId()).toBe("resizeEdge");

    // resizeEdge: entry seeds the start edge, Tab lands on end, resize.
    pressKey("Tab");
    pressKey("ArrowDown", { shiftKey: true });
    expect(currentStepId()).toBe("placeDraft");

    // placeDraft: nothing focused, Shift+Arrow drops a block.
    pressKey("ArrowRight", { shiftKey: true });
    expect(currentStepId()).toBe("undoRedo");
    expect(screen.getByText("Focus time")).toBeTruthy();

    // undoRedo: Mod+Z takes the block away, Mod+Shift+Z brings it back.
    pressKey("z", { metaKey: true });
    expect(screen.queryByText("Focus time")).toBeNull();
    pressKey("z", { metaKey: true, shiftKey: true });
    expect(currentStepId()).toBe("hardcore");
    expect(screen.getByText("Focus time")).toBeTruthy();

    // hardcore: H flips the simulated badge.
    pressKey("h");
    expect(currentStepId()).toBe("graduation");
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
    act(() => shortcutShowcaseActions.start());

    // No idle wait or failed attempt required: the way out is always offered.
    await user.click(screen.getByRole("button", { name: "Do it for me" }));
    expect(currentStepId()).toBe("save");

    showStep("graduation");
    expect(screen.queryByRole("button", { name: "Do it for me" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enter Compass" })).toBeTruthy();
  });

  it("shows the stretch hint one phase at a time: Tab, then Shift+Arrow", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    showStep("resizeEdge");

    // Phase one: only the key that moves focus onto the end time.
    expect(screen.getByTestId("tab-icon")).toBeTruthy();
    expect(screen.queryByTestId("shift-icon")).toBeNull();
    expect(screen.queryByTestId("arrowdown-icon")).toBeNull();

    pressKey("Tab");

    // Phase two: the end edge has focus, so the chord replaces Tab.
    expect(screen.queryByTestId("tab-icon")).toBeNull();
    expect(screen.getByTestId("shift-icon")).toBeTruthy();
    expect(screen.getByTestId("arrowdown-icon")).toBeTruthy();

    // Leaving and returning re-seeds the start edge, so the lesson restarts
    // at phase one rather than stranding the user on the chord.
    pressKey("ArrowDown", { shiftKey: true });
    expect(currentStepId()).toBe("placeDraft");
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(currentStepId()).toBe("resizeEdge");
    expect(screen.getByTestId("tab-icon")).toBeTruthy();
    expect(screen.queryByTestId("shift-icon")).toBeNull();
  });

  it("puts undo and redo chips in the undoRedo sentence, not a duplicate row", () => {
    render(<ShortcutShowcase />);
    showStep("undoRedo");

    expect(screen.getByText("to undo your last change, then")).toBeTruthy();
    expect(screen.getByText("to bring it back.")).toBeTruthy();
    expect(screen.getAllByTestId("z-icon")).toHaveLength(2);
    expect(screen.getByTestId("shift-icon")).toBeTruthy();
  });

  it("Escape confirms once, lesson keys fall through, second Escape skips", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.start());

    pressKey("Escape");
    expect(screen.getByText("Skip the shortcuts?")).toBeTruthy();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    // A lesson key cancels the confirm and still counts as the lesson.
    pressKey("c");
    expect(screen.queryByText("Skip the shortcuts?")).toBeNull();
    expect(currentStepId()).toBe("save");

    // C opened the title editor, so this Escape only closes the editor.
    pressKey("Escape");
    expect(screen.queryByLabelText("Event title")).toBeNull();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    // The confirm already ran once this entry: Escape now skips directly.
    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("Previous restores the prior step's board so it can be redone", async () => {
    const user = userEvent.setup();
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.start());

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
    act(() => shortcutShowcaseActions.start());

    // Burn the one skip confirm, then keep practicing.
    pressKey("Escape");
    pressKey("c");
    expect(currentStepId()).toBe("save");

    await user.type(screen.getByLabelText("Event title"), "Standup prep");
    pressKey("Escape");
    // Editor committed and closed; the showcase is still running.
    expect(screen.queryByLabelText("Event title")).toBeNull();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(screen.getByText("Standup prep")).toBeTruthy();

    // With no editor open, Escape now skips directly (confirm already seen).
    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });
});
