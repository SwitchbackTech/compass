import { selectLocalModeConnectPromptEligible } from "@web/components/LocalModeConnectPrompt/local-mode-connect.store";
import { describe, expect, it } from "bun:test";

const base = {
  authenticated: false,
  hasUserEverAuthenticated: false,
  isDismissed: false,
  storageAvailable: true,
  isAuthModalOpen: false,
  isShowcaseActive: false,
  isWelcomeBlocking: false,
  googleSignInAvailable: true,
  firstEventPromptVisible: false,
  firstEventCelebrating: false,
  writeCount: 0,
  shortcutEngagementCount: 0,
};

describe("selectLocalModeConnectPromptEligible", () => {
  it("shows after one write", () => {
    expect(
      selectLocalModeConnectPromptEligible({ ...base, writeCount: 1 }),
    ).toBe(true);
  });

  it("shows after five shortcuts without a write", () => {
    expect(
      selectLocalModeConnectPromptEligible({
        ...base,
        shortcutEngagementCount: 5,
      }),
    ).toBe(true);
  });

  it("waits while the first-event card owns the slot", () => {
    expect(
      selectLocalModeConnectPromptEligible({
        ...base,
        shortcutEngagementCount: 2,
        firstEventPromptVisible: true,
      }),
    ).toBe(false);
  });

  it("defers to the first-event celebration", () => {
    expect(
      selectLocalModeConnectPromptEligible({
        ...base,
        writeCount: 1,
        firstEventCelebrating: true,
      }),
    ).toBe(false);
  });
});
