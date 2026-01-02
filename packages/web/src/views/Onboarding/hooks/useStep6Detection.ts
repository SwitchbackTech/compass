import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import type { OnboardingStepName } from "../constants/onboarding.constants";
import { isStepCompleted } from "../utils/onboardingStorage.util";

interface UseStep6DetectionProps {
  currentStep: OnboardingStepName | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 6 completion: navigating to week view with '3' key
 * Monitors location changes to detect navigation to ROOT route (week view)
 * Skips detection if step is already completed
 */
export function useStep6Detection({
  currentStep,
  onStepComplete,
}: UseStep6DetectionProps): void {
  const location = useLocation();

  useEffect(() => {
    if (currentStep !== ONBOARDING_STEPS.NAVIGATE_TO_WEEK) {
      // Reset when not on step 6
      return;
    }

    // Skip detection if step is already completed
    if (isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_WEEK)) {
      return;
    }

    // Detect when user navigates to week view (ROOT route)
    if (location.pathname === ROOT_ROUTES.ROOT) {
      onStepComplete();
    }
  }, [currentStep, location.pathname, onStepComplete]);
}
