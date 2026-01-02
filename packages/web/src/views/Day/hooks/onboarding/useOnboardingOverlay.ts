import { useSession } from "@web/common/hooks/useSession";
import { useCmdPaletteGuide } from "@web/views/Onboarding/hooks/useCmdPaletteGuide";

interface UseOnboardingOverlayReturn {
  showOnboardingOverlay: boolean;
  currentStep: number | null;
  dismissOnboardingOverlay: () => void;
}

/**
 * Hook to manage the onboarding overlay visibility
 * Shows overlay when the cmd palette guide is active (for steps 1 and 2 on Day view)
 * The overlay stays visible and updates its content based on the current step
 */
export function useOnboardingOverlay(): UseOnboardingOverlayReturn {
  const { authenticated } = useSession();
  const { currentStep, isGuideActive, skipGuide } = useCmdPaletteGuide();

  // Show overlay when guide is active, on steps 1 or 2 (Day view steps), and user is not authenticated
  // Step 3 is for Now view, so overlay won't show for that step
  const showOnboardingOverlay =
    isGuideActive &&
    currentStep !== null &&
    (currentStep === 1 || currentStep === 2) &&
    !authenticated;

  const dismissOnboardingOverlay = () => {
    // Dismissing the overlay should skip the guide
    skipGuide();
  };

  return {
    showOnboardingOverlay,
    currentStep,
    dismissOnboardingOverlay,
  };
}
