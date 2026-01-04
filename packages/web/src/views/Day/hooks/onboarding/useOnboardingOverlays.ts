import type { OnboardingStepName } from "@web/views/Onboarding/constants/onboarding.constants";
import { useOnboardingProgress } from "@web/views/Onboarding/hooks/useOnboardingProgress";
import { useAuthPrompt } from "./useAuthPrompt";
import { useOnboardingOverlay } from "./useOnboardingOverlay";

interface UseOnboardingOverlaysProps {
  tasks: Array<{ id: string }>;
}

interface UseOnboardingOverlaysReturn {
  showOnboardingOverlay: boolean;
  currentStep: OnboardingStepName | null;
  showAuthPrompt: boolean;
  dismissOnboardingOverlay: () => void;
  dismissAuthPrompt: () => void;
}

/**
 * Composes multiple onboarding overlay hooks into a single hook
 * Manages the display logic for onboarding overlay and auth prompt
 */
export function useOnboardingOverlays({
  tasks,
}: UseOnboardingOverlaysProps): UseOnboardingOverlaysReturn {
  const { hasNavigatedDates } = useOnboardingProgress();
  const { showOnboardingOverlay, currentStep, dismissOnboardingOverlay } =
    useOnboardingOverlay();

  const { showAuthPrompt, dismissAuthPrompt } = useAuthPrompt({
    tasks,
    hasNavigatedDates,
    showOnboardingOverlay,
  });

  return {
    showOnboardingOverlay,
    currentStep,
    showAuthPrompt,
    dismissOnboardingOverlay,
    dismissAuthPrompt,
  };
}
