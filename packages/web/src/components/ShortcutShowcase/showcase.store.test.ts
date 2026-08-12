import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { SHOWCASE_STEP_IDS } from "@web/components/ShortcutShowcase/showcase.steps";
import {
  initialShortcutShowcaseState,
  shortcutShowcaseActions,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const LEGACY_TOUR_SEEN_KEY = "compass.onboarding.has-seen-onboarding-tour";

describe("shortcutShowcaseActions", () => {
  beforeEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "");
    persistentBrowserStore.set(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER, "");
    localStorage.setItem(LEGACY_TOUR_SEEN_KEY, "");
  });

  // Module-level singleton shared across the bun process: never leave the
  // showcase active (or mid-confirm) for suites that run after this file.
  afterEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
  });

  it("starts and advances through every step, finishing at the end", () => {
    shortcutShowcaseActions.start();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(0);

    for (let i = 1; i < SHOWCASE_STEP_IDS.length; i += 1) {
      shortcutShowcaseActions.advance();
      expect(useShortcutShowcaseStore.getState().stepIndex).toBe(i);
    }

    // Advancing off the last step finishes and marks seen.
    shortcutShowcaseActions.advance();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
  });

  it("never auto-starts once seen, but replay always works", () => {
    shortcutShowcaseActions.start();
    shortcutShowcaseActions.skip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    shortcutShowcaseActions.start();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    shortcutShowcaseActions.replay();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(0);
  });

  it("treats legacy tour finishers as having seen the showcase", () => {
    localStorage.setItem(LEGACY_TOUR_SEEN_KEY, "true");
    shortcutShowcaseActions.start();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("steps back to redo a lesson and no-ops on the first step", () => {
    shortcutShowcaseActions.start();
    shortcutShowcaseActions.advance();
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(1);

    shortcutShowcaseActions.back();
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(0);
    shortcutShowcaseActions.back();
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(0);
  });

  it("shows the skip confirm once, then remembers it for this entry", () => {
    shortcutShowcaseActions.start();
    shortcutShowcaseActions.requestSkipConfirm();
    expect(useShortcutShowcaseStore.getState().isConfirmingSkip).toBe(true);
    expect(useShortcutShowcaseStore.getState().hasShownSkipConfirm).toBe(true);

    shortcutShowcaseActions.cancelSkipConfirm();
    expect(useShortcutShowcaseStore.getState().isConfirmingSkip).toBe(false);
    expect(useShortcutShowcaseStore.getState().hasShownSkipConfirm).toBe(true);

    // A fresh entry resets the once-per-entry memory.
    shortcutShowcaseActions.skip();
    shortcutShowcaseActions.replay();
    expect(useShortcutShowcaseStore.getState().hasShownSkipConfirm).toBe(false);
  });

  it("blocks advance and back while the skip confirm is showing", () => {
    shortcutShowcaseActions.start();
    shortcutShowcaseActions.advance();
    shortcutShowcaseActions.requestSkipConfirm();
    shortcutShowcaseActions.advance();
    shortcutShowcaseActions.back();
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(1);
  });

  it("defers the offer through signup and redeems it exactly once", () => {
    shortcutShowcaseActions.markSkippedWithoutStarting({ pendingSignup: true });
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");

    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);

    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("burns the offer on plain dismiss or log-in handoff", () => {
    shortcutShowcaseActions.markSkippedWithoutStarting();
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
    shortcutShowcaseActions.start();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });
});
