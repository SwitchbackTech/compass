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
}
