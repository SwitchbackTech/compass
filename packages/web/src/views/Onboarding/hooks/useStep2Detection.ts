import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";

interface UseStep2DetectionProps {
  currentStep: number | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 2 completion: navigating to /now view
 * Monitors route changes
 */
export function useStep2Detection({
  currentStep,
  onStepComplete,
}: UseStep2DetectionProps): void {
  const location = useLocation();

  useEffect(() => {
    if (currentStep === 2 && location.pathname === ROOT_ROUTES.NOW) {
      onStepComplete();
    }
  }, [currentStep, location.pathname, onStepComplete]);
}
