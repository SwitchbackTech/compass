import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import {
  getPostOnboardingStage,
  type PostOnboardingStage,
  setPostOnboardingStage,
} from "@web/components/PostOnboardingFlow/post-onboarding-flow.storage";

export type PostOnboardingFlowState = {
  /** null: never triggered, so nothing renders. */
  stage: PostOnboardingStage | null;
};

export const usePostOnboardingFlowStore = create<PostOnboardingFlowState>()(
  () => ({
    stage: getPostOnboardingStage(),
  }),
);

const setStage = (stage: PostOnboardingStage) => {
  setPostOnboardingStage(stage);
  usePostOnboardingFlowStore.setState({ stage });
};

export const postOnboardingFlowActions = {
  /**
   * Called once the onboarding tour ends (finish or skip). A no-op if this
   * browser already went through the flow, so replaying the tour from the
   * command palette never re-shows connect/trial CTAs to a returning user.
   */
  startAfterTour: () => {
    if (usePostOnboardingFlowStore.getState().stage !== null) return;
    setStage("connect");
  },
  /** Google OAuth is a full navigation; persist the next stage first. */
  acceptConnect: () => {
    track("connect_cta_accepted");
    setStage("trial");
  },
  skipConnect: () => {
    track("connect_cta_skipped");
    setStage("trial");
  },
  dismissTrial: () => {
    setStage("done");
  },
};

export const selectPostOnboardingStage = (state: PostOnboardingFlowState) =>
  state.stage;
