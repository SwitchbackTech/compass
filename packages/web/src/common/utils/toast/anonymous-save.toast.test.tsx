import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { maybeShowAnonymousSaveToast } from "@web/common/utils/toast/anonymous-save.toast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  initialOnboardingTourState,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { usePostOnboardingFlowStore } from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("maybeShowAnonymousSaveToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/week");
    mocks.toast.mockClear();
    mocks.update.mockClear();
    registerToastPort(port);
    // These stores are module-level singletons shared across the whole test
    // run; a suite that leaves the tour "active" would otherwise leak in.
    useOnboardingTourStore.setState(initialOnboardingTourState);
    usePostOnboardingFlowStore.setState({ stage: null });
  });

  it("shows after an anonymous calendar write", () => {
    maybeShowAnonymousSaveToast();

    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_SEEN_ANONYMOUS_SAVE_TOAST),
    ).toBe("true");
  });

  it("does not interrupt an open sign-up flow", () => {
    window.history.replaceState({}, "", "/week?auth=signup");

    maybeShowAnonymousSaveToast();

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_SEEN_ANONYMOUS_SAVE_TOAST),
    ).toBeNull();
  });
});
