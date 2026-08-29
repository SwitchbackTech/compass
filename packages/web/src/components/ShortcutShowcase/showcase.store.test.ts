import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { SHOWCASE_STEP_IDS } from "@web/components/ShortcutShowcase/showcase.steps";
import {
  readShowcaseProgress,
  writeShowcaseProgress,
} from "@web/components/ShortcutShowcase/showcase.storage";
import {
  initialShortcutShowcaseState,
  shortcutShowcaseActions,
  stepIdAt,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const LEGACY_TOUR_SEEN_KEY = "compass.onboarding.has-seen-onboarding-tour";

describe("shortcutShowcaseActions", () => {
  beforeEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "");
    persistentBrowserStore.set(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER, "");
    persistentBrowserStore.remove(STORAGE_KEYS.SHORTCUT_SHOWCASE_STEP);
    localStorage.setItem(LEGACY_TOUR_SEEN_KEY, "");
  });

  // Module-level singleton shared across the bun process: never leave the
  // showcase active for suites that run after this file.
  afterEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
  });

  it("starts and advances through every step, finishing at the end", () => {
    shortcutShowcaseActions.startFromWelcome();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(0);
    expect(stepIdAt(0)).toBe("intro");

    for (let i = 1; i < SHOWCASE_STEP_IDS.length; i += 1) {
      shortcutShowcaseActions.advance();
      expect(useShortcutShowcaseStore.getState().stepIndex).toBe(i);
    }

    expect(readShowcaseProgress()).toBe(
      SHOWCASE_STEP_IDS[SHOWCASE_STEP_IDS.length - 1],
    );

    // Advancing off the last step finishes and marks seen.
    shortcutShowcaseActions.advance();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
    expect(readShowcaseProgress()).toBeNull();
  });

  it("replay skips the intro and opens the first lesson", () => {
    shortcutShowcaseActions.replay();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "create",
    );
  });

  it("never offers itself twice after signup, but replay always works", () => {
    shortcutShowcaseActions.deferUntilSignup();
    shortcutShowcaseActions.replay();
    shortcutShowcaseActions.skip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    // The offer is still pending, but the practice has now been seen.
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    shortcutShowcaseActions.replay();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "create",
    );
  });

  it("treats legacy tour finishers as having seen the showcase", () => {
    localStorage.setItem(LEGACY_TOUR_SEEN_KEY, "true");
    shortcutShowcaseActions.deferUntilSignup();
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("skip() leaves immediately, from any step and either exit", () => {
    shortcutShowcaseActions.replay();
    shortcutShowcaseActions.advance();
    shortcutShowcaseActions.skip("signup");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
    expect(readShowcaseProgress()).toBeNull();

    // Skipping an inactive showcase is a no-op, not a second skip event.
    shortcutShowcaseActions.skip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("arms skip on the first requestSkip and leaves on the second", () => {
    shortcutShowcaseActions.replay();
    shortcutShowcaseActions.requestSkip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(true);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
    expect(readShowcaseProgress()).toBe("create");

    shortcutShowcaseActions.requestSkip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
    expect(readShowcaseProgress()).toBeNull();
  });

  it("requestSkip on an inactive showcase is a no-op", () => {
    shortcutShowcaseActions.requestSkip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(false);
  });

  it("advance clears a pending skip and keeps the practice running", () => {
    shortcutShowcaseActions.startFromWelcome();
    shortcutShowcaseActions.requestSkip();
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(true);

    shortcutShowcaseActions.advance();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().skipPending).toBe(false);
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "create",
    );
  });

  it("persists the current step and resumes it without marking seen", () => {
    shortcutShowcaseActions.startFromWelcome();
    expect(readShowcaseProgress()).toBe("intro");
    shortcutShowcaseActions.advance();
    expect(readShowcaseProgress()).toBe("create");

    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    shortcutShowcaseActions.resumeIfInProgress();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "create",
    );
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
  });

  it("falls back to intro for an unknown saved step", () => {
    writeShowcaseProgress("retiredStep");
    shortcutShowcaseActions.resumeIfInProgress();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "intro",
    );
    expect(readShowcaseProgress()).toBe("intro");
  });

  it("does not resume after the showcase has been seen", () => {
    shortcutShowcaseActions.replay();
    shortcutShowcaseActions.skip();
    writeShowcaseProgress("create");
    shortcutShowcaseActions.resumeIfInProgress();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("replay overwrites saved progress with the first lesson", () => {
    shortcutShowcaseActions.startFromWelcome();
    shortcutShowcaseActions.advance();
    expect(readShowcaseProgress()).toBe("create");

    shortcutShowcaseActions.replay();
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "create",
    );
    expect(readShowcaseProgress()).toBe("create");
  });

  it("defers the offer through signup and redeems it exactly once", () => {
    shortcutShowcaseActions.deferUntilSignup();
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");

    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("starts from welcome on the intro without marking the practice seen", () => {
    shortcutShowcaseActions.startFromWelcome();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(stepIdAt(useShortcutShowcaseStore.getState().stepIndex)).toBe(
      "intro",
    );
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
  });

  it("does not start the practice until the pending signup offer is redeemed", () => {
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });
});
