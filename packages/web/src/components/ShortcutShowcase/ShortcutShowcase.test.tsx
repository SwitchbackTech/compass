import { act, fireEvent, render, screen } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { ShortcutShowcase } from "@web/components/ShortcutShowcase/ShortcutShowcase";
import { SHOWCASE_STEP_IDS } from "@web/components/ShortcutShowcase/showcase.steps";
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

  it("advances through every lesson by doing, and graduates on Enter", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.start());

    // create: C opens a draft with its title editor.
    pressKey("c");
    expect(currentStepId()).toBe("save");

    // save: type a title into the editor, Enter commits.
    const titleInput = screen.getByLabelText("Event title");
    fireEvent.change(titleInput, { target: { value: "Coffee with Alex" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });
    expect(currentStepId()).toBe("moveFocus");
    expect(screen.getByText("Coffee with Alex")).toBeTruthy();

    // moveFocus: an arrow that lands on a different block advances.
    pressKey("ArrowLeft");
    expect(currentStepId()).toBe("editTitle");

    // editTitle: e then t opens the focused block's title editor.
    pressKey("e");
    pressKey("t");
    expect(currentStepId()).toBe("eventJump");

    // eventJump: S flashes chips, a chip letter jumps.
    pressKey("s");
    pressKey("j");
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
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
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

    // The confirm already ran once this entry: Escape now skips directly.
    pressKey("Escape");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("Previous restores the prior step's board so it can be redone", () => {
    render(<ShortcutShowcase />);
    act(() => shortcutShowcaseActions.start());

    pressKey("c");
    expect(currentStepId()).toBe("save");
    expect(screen.getByLabelText("Event title")).toBeTruthy();

    fireEvent.click(screen.getByText("Previous"));
    expect(currentStepId()).toBe("create");
    // The board rewound with the step: the draft is gone, C works again.
    expect(screen.queryByLabelText("Event title")).toBeNull();
    pressKey("c");
    expect(currentStepId()).toBe("save");
  });
});
