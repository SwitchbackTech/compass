import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { sessionBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  emitWelcomeIntroAnalyticsOnce,
  emitWelcomeStepViewedOnce,
  resetWelcomeAnalyticsForTests,
} from "@web/components/WelcomeModal/welcome-analytics.util";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const track = mock();
const trackSignupStep = mock();

mock.module("@web/auth/posthog/track", () => ({ track }));
mock.module("@web/auth/posthog/signup-funnel", () => ({
  trackSignupStep,
}));

describe("welcome analytics session guards", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetWelcomeAnalyticsForTests();
    track.mockClear();
    trackSignupStep.mockClear();
  });

  afterEach(() => {
    sessionStorage.clear();
    resetWelcomeAnalyticsForTests();
  });

  it("emits intro funnel events only once per session", () => {
    emitWelcomeIntroAnalyticsOnce();
    emitWelcomeIntroAnalyticsOnce();

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenCalledWith("welcome_modal_shown");
    expect(track).toHaveBeenCalledWith("welcome_step_viewed", { step: 1 });
    expect(trackSignupStep).toHaveBeenCalledTimes(1);
    expect(trackSignupStep).toHaveBeenCalledWith("welcome_viewed");
    expect(
      sessionBrowserStore.get(STORAGE_KEYS.WELCOME_INTRO_ANALYTICS_SESSION),
    ).toBe("true");
  });

  it("emits each welcome step viewed once per session", () => {
    emitWelcomeStepViewedOnce(2);
    emitWelcomeStepViewedOnce(2);
    emitWelcomeStepViewedOnce(3);

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenNthCalledWith(1, "welcome_step_viewed", {
      step: 2,
    });
    expect(track).toHaveBeenNthCalledWith(2, "welcome_step_viewed", {
      step: 3,
    });
  });
});
