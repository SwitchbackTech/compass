import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import {
  getNextOnboardingStepId,
  type OnboardingTourStepId,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  consumePendingTourOffer,
  hasSeenOnboardingTour,
  markOnboardingTourSeen,
  markTourOfferPending,
} from "@web/components/OnboardingTour/onboarding.tour.storage";

export type OnboardingTourState = {
  isActive: boolean;
  stepId: OnboardingTourStepId;
};

export const initialOnboardingTourState: OnboardingTourState = {
  isActive: false,
  stepId: "create",
};

export const useOnboardingTourStore = create<OnboardingTourState>()(() => ({
  ...initialOnboardingTourState,
}));

/** Shared by finish/skip: mark the tour seen and clear active state. */
const endTour = () => {
  markOnboardingTourSeen();
  useOnboardingTourStore.setState({ ...initialOnboardingTourState });
};

export const onboardingTourActions = {
  /** Start Now: begin the interactive tour when it has not been finished. */
  start: () => {
    if (hasSeenOnboardingTour()) return;
    useOnboardingTourStore.setState({ isActive: true, stepId: "create" });
    track("onboarding_game_started");
  },
  /** Palette re-entry: always restart from the first step. */
  restart: () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "create" });
    track("onboarding_game_replayed", { source: "palette" });
  },
  advance: () => {
    const { isActive, stepId } = useOnboardingTourStore.getState();
    if (!isActive) return;
    track("onboarding_task_completed", { task: stepId });
    const next = getNextOnboardingStepId(stepId);
    if (!next) {
      onboardingTourActions.finish();
      return;
    }
    if (stepId === "fork") {
      track("onboarding_segment_reached", { segment: "advanced" });
    }
    useOnboardingTourStore.setState({ stepId: next });
  },
  /** Reached the last step. */
  finish: () => {
    track("onboarding_game_finished");
    endTour();
  },
  /** User dismissed the tour early (Skip button, the fork's "I'm done", or Escape). */
  skip: () => {
    const { stepId } = useOnboardingTourStore.getState();
    track("onboarding_game_skipped", { step: stepId });
    endTour();
  },
  /**
   * Welcome backdrop/auth dismiss: never trap. If the user is heading into
   * signup, defer the seen-flag so the tour can be offered once, right after
   * signup completes, instead of being burned forever (log-in and plain
   * dismiss mark it seen immediately — only signup gets the deferred offer).
   */
  markSkippedWithoutStarting: (options?: { pendingSignup?: boolean }) => {
    if (options?.pendingSignup) {
      markTourOfferPending();
      return;
    }
    markOnboardingTourSeen();
  },
  /** Called once, right after signup completes, to redeem a pending offer. */
  offerAfterSignupIfPending: () => {
    if (!consumePendingTourOffer()) return;
    if (hasSeenOnboardingTour()) return;
    useOnboardingTourStore.setState({ isActive: true, stepId: "create" });
    track("onboarding_game_started");
  },
};

export const selectOnboardingTourActive = (state: OnboardingTourState) =>
  state.isActive;

export const selectOnboardingTourStepId = (state: OnboardingTourState) =>
  state.stepId;
