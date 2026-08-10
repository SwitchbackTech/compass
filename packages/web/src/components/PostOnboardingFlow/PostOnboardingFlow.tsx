import { type FC, useContext } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
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
 *
 * Gated on `authenticated` here too (not just at the trigger that sets
 * `stage`): a user can become authenticated by a path other than accepting
 * Connect Google, which would otherwise leave a stale "connect"/"trial"
 * stage in localStorage that renders on their next load even though
 * usePostOnboardingFlowTrigger's own effect resolves it moments later.
 */
export const PostOnboardingFlow: FC = () => {
  usePostOnboardingFlowTrigger();
  const { authenticated } = useContext(SessionContext);
  const stage = usePostOnboardingFlowStore(selectPostOnboardingStage);

  if (authenticated) return null;
  if (stage === "connect") return <ConnectGoogleCTA />;
  if (stage === "trial") return <TrialCTA />;
  return null;
};
