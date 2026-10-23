import { setAuthSessionAuthenticated } from "@web/auth/compass/session/auth-session.store";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  claimHintShortcutCelebration,
  hasHintShortcutBeenCelebrated,
  mergeHintShortcutCelebrationFromMetadata,
  readLocalHintShortcutCelebratedKeys,
} from "@web/shortcuts/tips/hint-shortcut-celebration.storage";
import { afterEach, describe, expect, it } from "bun:test";

describe("hintShortcutCelebration storage", () => {
  afterEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.SHORTCUT_HINT_FIRST_USED);
    userMetadataActions.clear();
    setAuthSessionAuthenticated(false);
  });

  it("claims once and writes local storage before returning true", () => {
    expect(claimHintShortcutCelebration("grid-scroll:pagedown")).toBe(true);
    expect(readLocalHintShortcutCelebratedKeys()).toContain(
      "grid-scroll:pagedown",
    );
    expect(claimHintShortcutCelebration("grid-scroll:pagedown")).toBe(false);
  });

  it("treats account keys as already seen on a fresh device after metadata merge", () => {
    userMetadataActions.set({
      shortcuts: { hintFirstUsed: ["grid-scroll:pagedown"] },
    });

    mergeHintShortcutCelebrationFromMetadata({
      shortcuts: { hintFirstUsed: ["grid-scroll:pagedown"] },
    });

    expect(readLocalHintShortcutCelebratedKeys()).toContain(
      "grid-scroll:pagedown",
    );
    expect(hasHintShortcutBeenCelebrated("grid-scroll:pagedown")).toBe(true);
    expect(claimHintShortcutCelebration("grid-scroll:pagedown")).toBe(false);
  });

  it("reads account keys as seen even before local merge when metadata is loaded", () => {
    setAuthSessionAuthenticated(true);
    userMetadataActions.set({
      shortcuts: { hintFirstUsed: ["week-nav:j"] },
    });

    expect(hasHintShortcutBeenCelebrated("week-nav:j")).toBe(true);
    expect(claimHintShortcutCelebration("week-nav:j")).toBe(false);
  });
});
