import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import {
  getNextOnboardingStepId,
  getPreviousOnboardingStepId,
  type OnboardingTourStepId,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  clearTourProgress,
  consumePendingTourOffer,
  hasSeenOnboardingTour,
  markOnboardingTourSeen,
  markTourOfferPending,
  saveTourProgress,
} from "@web/components/OnboardingTour/onboarding.tour.storage";
import { draftActions } from "@web/events/stores/draft.store";

export type OnboardingTourState = {
  isActive: boolean;
  stepId: OnboardingTourStepId;
  /** True while the "skip the tour?" inline confirm is showing (Escape path). */
  isConfirmingSkip: boolean;
};

export const initialOnboardingTourState: OnboardingTourState = {
  isActive: false,
  stepId: "create",
  isConfirmingSkip: false,
};

export const useOnboardingTourStore = create<OnboardingTourState>()(() => ({
  ...initialOnboardingTourState,
}));

/** Shared by finish/skip: mark the tour seen and clear active state. */
const endTour = () => {
  draftActions.discard();
  markOnboardingTourSeen();
  clearTourProgress();
  useOnboardingTourStore.setState({ ...initialOnboardingTourState });
};

export const onboardingTourActions = {
  /** Start Now / Escape: begin the interactive tour when it has not been finished. */
  start: (entry: "start_now" | "escape" = "start_now") => {
    if (hasSeenOnboardingTour()) return;
    useOnboardingTourStore.setState({
      isActive: true,
      stepId: "create",
      isConfirmingSkip: false,
    });
    saveTourProgress("create");
    track("onboarding_game_started", { entry });
  },
  /** Resume card: pick up an abandoned tour at its saved step. */
  resume: (stepId: OnboardingTourStepId) => {
    if (hasSeenOnboardingTour()) return;
    useOnboardingTourStore.setState({
      isActive: true,
      stepId,
      isConfirmingSkip: false,
    });
    track("onboarding_game_started", { entry: "resume" });
  },
  /** Palette re-entry: always restart from the first step. */
  restart: () => {
    useOnboardingTourStore.setState({
      isActive: true,
      stepId: "create",
      isConfirmingSkip: false,
    });
    saveTourProgress("create");
    track("onboarding_game_replayed", { source: "palette" });
  },
  advance: () => {
    const { isActive, stepId, isConfirmingSkip } =
      useOnboardingTourStore.getState();
    if (!isActive || isConfirmingSkip) return;
    track("onboarding_task_completed", { task: stepId });
    const next = getNextOnboardingStepId(stepId);
    if (!next) {
      onboardingTourActions.finish();
      return;
    }
    if (stepId === "fork") {
      track("onboarding_segment_reached", { segment: "advanced" });
    }
    saveTourProgress(next);
    useOnboardingTourStore.setState({ stepId: next });
  },
  /** Step back one lesson; no-op on the first step. */
  retreat: () => {
    const { isActive, stepId, isConfirmingSkip } =
      useOnboardingTourStore.getState();
    if (!isActive || isConfirmingSkip) return;
    const previous = getPreviousOnboardingStepId(stepId);
    if (!previous) return;
    saveTourProgress(previous);
    useOnboardingTourStore.setState({ stepId: previous });
  },
  /** Reached the last step. */
  finish: () => {
    track("onboarding_game_finished");
    endTour();
  },
  /** User dismissed the tour early (Skip button, the fork's "I'm done", or a confirmed Escape). */
  skip: () => {
    const { stepId } = useOnboardingTourStore.getState();
    track("onboarding_game_skipped", { step: stepId });
    endTour();
  },
  /** Escape, first press: show the inline "skip the tour?" confirm instead of skipping immediately. */
  requestSkipConfirm: () => {
    const { isActive } = useOnboardingTourStore.getState();
    if (!isActive) return;
    useOnboardingTourStore.setState({ isConfirmingSkip: true });
  },
  /** Any key other than Enter while confirming: cancel and keep going. */
  cancelSkipConfirm: () => {
    useOnboardingTourStore.setState({ isConfirmingSkip: false });
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
    useOnboardingTourStore.setState({
      isActive: true,
      stepId: "create",
      isConfirmingSkip: false,
    });
    saveTourProgress("create");
    track("onboarding_game_started", { entry: "post_signup" });
  },
};

export const selectOnboardingTourActive = (state: OnboardingTourState) =>
  state.isActive;

export const selectOnboardingTourStepId = (state: OnboardingTourState) =>
  state.stepId;

export const selectIsConfirmingTourSkip = (state: OnboardingTourState) =>
  state.isConfirmingSkip;
