import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  initialOnboardingTourState,
  onboardingTourActions,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("onboardingTourActions", () => {
  beforeEach(() => {
    useOnboardingTourStore.setState(initialOnboardingTourState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR, "");
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_CMD_PALETTE_HINT, "");
  });

  it("starts the tour and advances through steps", () => {
    onboardingTourActions.start();
    expect(useOnboardingTourStore.getState().isActive).toBe(true);
    expect(useOnboardingTourStore.getState().stepId).toBe("create");

    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("save");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("palette");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("shortcuts");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("done");
  });

  it("finish and skip persist the seen flag and clear active state", () => {
    onboardingTourActions.start();
    onboardingTourActions.finish();
    expect(useOnboardingTourStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR),
    ).toBe("true");
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_CMD_PALETTE_HINT),
    ).toBe("true");

    useOnboardingTourStore.setState(initialOnboardingTourState);
    onboardingTourActions.start();
    expect(useOnboardingTourStore.getState().isActive).toBe(false);

    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR, "");
    onboardingTourActions.start();
    onboardingTourActions.skip();
    expect(useOnboardingTourStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR),
    ).toBe("true");
  });

  it("restart works even after the tour was marked seen", () => {
    onboardingTourActions.markSkippedWithoutStarting();
    onboardingTourActions.restart();
    expect(useOnboardingTourStore.getState()).toEqual({
      isActive: true,
      stepId: "create",
    });
  });
});
