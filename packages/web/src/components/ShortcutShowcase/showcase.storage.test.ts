import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  clearShowcaseProgress,
  readShowcaseProgress,
  writeShowcaseProgress,
} from "@web/components/ShortcutShowcase/showcase.storage";
import { afterEach, describe, expect, it } from "bun:test";

describe("showcase progress storage", () => {
  afterEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.SHORTCUT_SHOWCASE_STEP);
  });

  it("round-trips a step id and clears it", () => {
    expect(readShowcaseProgress()).toBeNull();

    writeShowcaseProgress("create");
    expect(readShowcaseProgress()).toBe("create");
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.SHORTCUT_SHOWCASE_STEP),
    ).toBe("create");

    clearShowcaseProgress();
    expect(readShowcaseProgress()).toBeNull();
  });

  it("treats an empty stored value as no progress", () => {
    persistentBrowserStore.set(STORAGE_KEYS.SHORTCUT_SHOWCASE_STEP, "");
    expect(readShowcaseProgress()).toBeNull();
  });
});
