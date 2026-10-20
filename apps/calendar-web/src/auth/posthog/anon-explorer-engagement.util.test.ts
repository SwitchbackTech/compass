import {
  incrementAnonymousShortcutEngagementCount,
  isAnonymousExplorerEngaged,
  shouldDeferFirstEventPromptForSignUpNudge,
} from "@web/auth/posthog/anon-explorer-engagement.util";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("anon explorer engagement", () => {
  beforeEach(() => {
    persistentBrowserStore.set(STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT, "");
    persistentBrowserStore.set(
      STORAGE_KEYS.ANONYMOUS_SHORTCUT_ENGAGEMENT_COUNT,
      "",
    );
  });

  it("engages on one calendar write", () => {
    persistentBrowserStore.set(
      STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
      "1",
    );
    expect(isAnonymousExplorerEngaged()).toBe(true);
  });

  it("engages after five shortcut invocations", () => {
    for (let i = 0; i < 5; i++) {
      incrementAnonymousShortcutEngagementCount();
    }
    expect(isAnonymousExplorerEngaged()).toBe(true);
  });

  it("defers the first-event card for shortcut-only engagement", () => {
    for (let i = 0; i < 5; i++) {
      incrementAnonymousShortcutEngagementCount();
    }
    expect(shouldDeferFirstEventPromptForSignUpNudge()).toBe(true);
  });
});
