import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  isWelcomeOnboardingPathBlocked,
  markWelcomeSeen,
  readWelcomeExit,
  selectWelcomeModalSurfaceEligible,
} from "@web/components/WelcomeModal/welcome.modal.util";
import { afterEach, describe, expect, it } from "bun:test";

describe("welcome modal storage", () => {
  afterEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.HAS_SEEN_WELCOME);
    persistentBrowserStore.remove(STORAGE_KEYS.WELCOME_EXIT);
  });

  it("keeps the welcome modal away from a first visit that came for meeting setup", () => {
    expect(
      selectWelcomeModalSurfaceEligible(true, false, false, false, false),
    ).toBe(true);
    expect(
      selectWelcomeModalSurfaceEligible(true, false, false, true, false),
    ).toBe(false);
    expect(
      selectWelcomeModalSurfaceEligible(true, false, false, false, true),
    ).toBe(false);
  });

  it("blocks welcome on public /meet paths and meetingSetup links", () => {
    expect(isWelcomeOnboardingPathBlocked("/meet/host")).toBe(true);
    expect(isWelcomeOnboardingPathBlocked("/week")).toBe(false);
    expect(isWelcomeOnboardingPathBlocked("/week", { meetingSetup: 1 })).toBe(
      true,
    );
  });

  it("records the exit CTA when welcome is dismissed", () => {
    markWelcomeSeen("explore");
    expect(readWelcomeExit()).toBe("explore");

    markWelcomeSeen("sign_up");
    expect(readWelcomeExit()).toBe("sign_up");
  });
});
