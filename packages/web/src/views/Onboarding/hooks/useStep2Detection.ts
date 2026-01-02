import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import type { OnboardingStepName } from "../constants/onboarding.constants";
import { isStepCompleted } from "../utils/onboardingStorage.util";

interface UseStep2DetectionProps {
  currentStep: OnboardingStepName | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 2 completion: navigating to /now view
 * Monitors route changes
 * Skips detection if step is already completed
 */
export function useStep2Detection({
  currentStep,
  onStepComplete,
}: UseStep2DetectionProps): void {
  const location = useLocation();

  useEffect(() => {
    // Skip detection if step is already completed
    if (isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW)) {
      return;
    }

    if (
      currentStep === ONBOARDING_STEPS.NAVIGATE_TO_NOW &&
      location.pathname === ROOT_ROUTES.NOW
    ) {
      onStepComplete();
    }
  }, [currentStep, location.pathname, onStepComplete]);
}
