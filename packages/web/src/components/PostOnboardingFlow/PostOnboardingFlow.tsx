import { type FC } from "react";
import { ConnectGoogleCTA } from "@web/components/PostOnboardingFlow/ConnectGoogleCTA";
import {
  selectPostOnboardingStage,
  usePostOnboardingFlowStore,
} from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";
import { TrialCTA } from "@web/components/PostOnboardingFlow/TrialCTA";
import { usePostOnboardingFlowTrigger } from "@web/components/PostOnboardingFlow/usePostOnboardingFlowTrigger";

/**
 * Renders the connect-Google and trial CTAs after the onboarding tour ends.
 * Both steps are skippable; skipping connect goes straight to the trial CTA.
 */
export const PostOnboardingFlow: FC = () => {
  usePostOnboardingFlowTrigger();
  const stage = usePostOnboardingFlowStore(selectPostOnboardingStage);

  if (stage === "connect") return <ConnectGoogleCTA />;
  if (stage === "trial") return <TrialCTA />;
  return null;
};
