import { create } from "zustand";
import {
  getNextOnboardingStepId,
  type OnboardingTourStepId,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  hasSeenOnboardingTour,
  markOnboardingTourSeen,
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
  },
  /** Palette re-entry: always restart from the first step. */
  restart: () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "create" });
  },
  advance: () => {
    const { isActive, stepId } = useOnboardingTourStore.getState();
    if (!isActive) return;
    const next = getNextOnboardingStepId(stepId);
    if (!next) {
      onboardingTourActions.finish();
      return;
    }
    useOnboardingTourStore.setState({ stepId: next });
  },
  /** Reached the last step. */
  finish: endTour,
  /** User dismissed the tour early (Skip button or Escape). */
  skip: endTour,
  /** Welcome backdrop/auth dismiss: never trap; mark seen without starting. */
  markSkippedWithoutStarting: () => {
    markOnboardingTourSeen();
  },
};

export const selectOnboardingTourActive = (state: OnboardingTourState) =>
  state.isActive;

export const selectOnboardingTourStepId = (state: OnboardingTourState) =>
  state.stepId;
