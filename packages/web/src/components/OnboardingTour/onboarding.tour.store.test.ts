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
  });

  it("starts the tour and advances through steps", () => {
    onboardingTourActions.start();
    expect(useOnboardingTourStore.getState().isActive).toBe(true);
    expect(useOnboardingTourStore.getState().stepId).toBe("create");

    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("save");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("moveFocus");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("editSequence");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("fork");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("targetEvent");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("move");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("resizeEdge");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("placeDraft");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("undo");
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("hardcore");
  });

  it("skip at the fork ends the tour without entering the advanced segment", () => {
    onboardingTourActions.start();
    useOnboardingTourStore.setState({ stepId: "fork" });
    onboardingTourActions.skip();
    expect(useOnboardingTourStore.getState().isActive).toBe(false);
    expect(useOnboardingTourStore.getState().stepId).toBe("create");
  });

  it("defers the seen flag when heading into signup, then redeems it once", () => {
    onboardingTourActions.markSkippedWithoutStarting({ pendingSignup: true });
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR),
    ).not.toBe("true");

    onboardingTourActions.offerAfterSignupIfPending();
    expect(useOnboardingTourStore.getState().isActive).toBe(true);
    expect(useOnboardingTourStore.getState().stepId).toBe("create");

    // Second redemption attempt is a no-op: the pending flag was consumed.
    useOnboardingTourStore.setState(initialOnboardingTourState);
    onboardingTourActions.offerAfterSignupIfPending();
    expect(useOnboardingTourStore.getState().isActive).toBe(false);
  });

  it("finish and skip persist the seen flag and clear active state", () => {
    onboardingTourActions.start();
    onboardingTourActions.finish();
    expect(useOnboardingTourStore.getState().isActive).toBe(false);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR),
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

  it("retreats to the previous step and no-ops on the first", () => {
    onboardingTourActions.start();
    onboardingTourActions.advance();
    expect(useOnboardingTourStore.getState().stepId).toBe("save");

    onboardingTourActions.retreat();
    expect(useOnboardingTourStore.getState().stepId).toBe("create");

    onboardingTourActions.retreat();
    expect(useOnboardingTourStore.getState().stepId).toBe("create");
  });

  it("restart works even after the tour was marked seen", () => {
    onboardingTourActions.markSkippedWithoutStarting();
    onboardingTourActions.restart();
    expect(useOnboardingTourStore.getState()).toEqual({
      isActive: true,
      stepId: "create",
      isConfirmingSkip: false,
    });
  });
});
