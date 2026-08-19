import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  getFirstEventDone,
  markFirstEventDone,
} from "@web/components/FirstEventPrompt/first-event.storage";
import { beforeEach, describe, expect, it } from "bun:test";

const LEGACY_CHECKLIST_DONE_KEY = "compass.onboarding.checklist-done";

describe("first-event storage", () => {
  beforeEach(() => {
    persistentBrowserStore.set(STORAGE_KEYS.FIRST_EVENT_DONE, "");
    localStorage.setItem(LEGACY_CHECKLIST_DONE_KEY, "");
  });

  it("is unset until marked", () => {
    expect(getFirstEventDone()).toBeNull();
  });

  it("persists completed and dismissed reasons", () => {
    markFirstEventDone("completed");
    expect(getFirstEventDone()).toBe("completed");

    markFirstEventDone("dismissed");
    expect(getFirstEventDone()).toBe("dismissed");
  });

  it("honors the retired checklist's done key so past finishers/dismissers never see the prompt", () => {
    localStorage.setItem(LEGACY_CHECKLIST_DONE_KEY, "completed");
    expect(getFirstEventDone()).toBe("completed");

    localStorage.setItem(LEGACY_CHECKLIST_DONE_KEY, "dismissed");
    expect(getFirstEventDone()).toBe("dismissed");
  });

  it("prefers the new key over the legacy one once both are set", () => {
    localStorage.setItem(LEGACY_CHECKLIST_DONE_KEY, "dismissed");
    markFirstEventDone("completed");
    expect(getFirstEventDone()).toBe("completed");
  });
});
