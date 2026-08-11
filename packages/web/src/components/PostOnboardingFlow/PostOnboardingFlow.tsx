import { type FC, useContext } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { ConnectGoogleCTA } from "@web/components/PostOnboardingFlow/ConnectGoogleCTA";
import {
  selectPostOnboardingStage,
  usePostOnboardingFlowStore,
} from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";
import { usePostOnboardingFlowTrigger } from "@web/components/PostOnboardingFlow/usePostOnboardingFlowTrigger";

/**
 * Renders the connect-Google CTA after the onboarding tour ends. The trial
 * itself is automatic (see packages/web/src/billing/), so there is no
 * separate trial CTA step — connecting is the only optional step left.
 *
 * Gated on `authenticated` here too (not just at the trigger that sets
 * `stage`): a user can become authenticated by a path other than accepting
 * Connect Google, which would otherwise leave a stale "connect" stage in
 * localStorage that renders on their next load even though
 * usePostOnboardingFlowTrigger's own effect resolves it moments later.
 */
export const PostOnboardingFlow: FC = () => {
  usePostOnboardingFlowTrigger();
  const { authenticated } = useContext(SessionContext);
  const stage = usePostOnboardingFlowStore(selectPostOnboardingStage);

  if (authenticated) return null;
  if (stage === "connect") return <ConnectGoogleCTA />;
  return null;
};
