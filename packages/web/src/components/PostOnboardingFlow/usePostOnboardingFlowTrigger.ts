import { useContext, useEffect, useRef } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import {
  selectOnboardingTourActive,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { postOnboardingFlowActions } from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";

/**
 * Starts the connect/trial flow the moment the onboarding tour ends
 * (finish or skip), for anonymous users only. Authenticated users already
 * connected or paying have nothing to gain from these CTAs.
 */
export function usePostOnboardingFlowTrigger() {
  const { authenticated } = useContext(SessionContext);
  const isTourActive = useOnboardingTourStore(selectOnboardingTourActive);
  const wasTourActive = useRef(false);

  useEffect(() => {
    if (wasTourActive.current && !isTourActive && !authenticated) {
      postOnboardingFlowActions.startAfterTour();
    }
    wasTourActive.current = isTourActive;
  }, [isTourActive, authenticated]);

  // A user can become authenticated by a path other than accepting the
  // Connect Google CTA (e.g. email/password login, or Google auth from
  // elsewhere in the app), leaving a stale "connect"/"trial" stage in
  // localStorage. Resolve it so an established, possibly already-paying
  // user is never shown these CTAs on a later load. PostOnboardingFlow also
  // gates its own render on `authenticated` as defense in depth.
  useEffect(() => {
    if (authenticated) {
      postOnboardingFlowActions.resolveOnAuth();
    }
  }, [authenticated]);
}
