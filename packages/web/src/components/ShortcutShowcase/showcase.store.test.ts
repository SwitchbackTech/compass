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
  // showcase active for suites that run after this file.
  afterEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
  });

  it("starts and advances through every step, finishing at the end", () => {
    shortcutShowcaseActions.replay();
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

  it("never offers itself twice after signup, but replay always works", () => {
    shortcutShowcaseActions.markSkippedWithoutStarting({ pendingSignup: true });
    shortcutShowcaseActions.replay();
    shortcutShowcaseActions.skip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    // The offer is still pending, but the practice has now been seen.
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    shortcutShowcaseActions.replay();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    expect(useShortcutShowcaseStore.getState().stepIndex).toBe(0);
  });

  it("treats legacy tour finishers as having seen the showcase", () => {
    localStorage.setItem(LEGACY_TOUR_SEEN_KEY, "true");
    shortcutShowcaseActions.markSkippedWithoutStarting({ pendingSignup: true });
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("skips on the first request, from any step and either exit", () => {
    shortcutShowcaseActions.replay();
    shortcutShowcaseActions.advance();
    shortcutShowcaseActions.skip("signup");
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");

    // Skipping an inactive showcase is a no-op, not a second skip event.
    shortcutShowcaseActions.skip();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
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

  it("burns the offer when exploring without an account or logging in", () => {
    shortcutShowcaseActions.markSkippedWithoutStarting();
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe("true");
    shortcutShowcaseActions.offerAfterSignupIfPending();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });
});
