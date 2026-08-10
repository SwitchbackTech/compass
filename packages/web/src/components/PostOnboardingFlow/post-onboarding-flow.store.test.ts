import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  postOnboardingFlowActions,
  usePostOnboardingFlowStore,
} from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("postOnboardingFlowActions", () => {
  beforeEach(() => {
    persistentBrowserStore.set(STORAGE_KEYS.POST_TOUR_STAGE, "");
    usePostOnboardingFlowStore.setState({ stage: null });
  });

  it("starts at connect and persists the stage", () => {
    postOnboardingFlowActions.startAfterTour();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("connect");
    expect(persistentBrowserStore.get(STORAGE_KEYS.POST_TOUR_STAGE)).toBe(
      "connect",
    );
  });

  it("does not retrigger once already started", () => {
    postOnboardingFlowActions.startAfterTour();
    postOnboardingFlowActions.skipConnect();
    postOnboardingFlowActions.startAfterTour();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("trial");
  });

  it("skip and accept both move connect to trial", () => {
    postOnboardingFlowActions.startAfterTour();
    postOnboardingFlowActions.skipConnect();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("trial");

    usePostOnboardingFlowStore.setState({ stage: "connect" });
    postOnboardingFlowActions.acceptConnect();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("trial");
  });

  it("dismissing the trial CTA ends the flow for good", () => {
    usePostOnboardingFlowStore.setState({ stage: "trial" });
    postOnboardingFlowActions.dismissTrial();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("done");
    expect(persistentBrowserStore.get(STORAGE_KEYS.POST_TOUR_STAGE)).toBe(
      "done",
    );
  });

  it("resolveOnAuth clears a stale connect/trial stage left by a non-Google login", () => {
    usePostOnboardingFlowStore.setState({ stage: "connect" });
    postOnboardingFlowActions.resolveOnAuth();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("done");
    expect(persistentBrowserStore.get(STORAGE_KEYS.POST_TOUR_STAGE)).toBe(
      "done",
    );

    usePostOnboardingFlowStore.setState({ stage: "trial" });
    postOnboardingFlowActions.resolveOnAuth();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("done");
  });

  it("resolveOnAuth is a no-op when there is nothing to resolve", () => {
    usePostOnboardingFlowStore.setState({ stage: null });
    postOnboardingFlowActions.resolveOnAuth();
    expect(usePostOnboardingFlowStore.getState().stage).toBeNull();

    usePostOnboardingFlowStore.setState({ stage: "done" });
    postOnboardingFlowActions.resolveOnAuth();
    expect(usePostOnboardingFlowStore.getState().stage).toBe("done");
  });
});
