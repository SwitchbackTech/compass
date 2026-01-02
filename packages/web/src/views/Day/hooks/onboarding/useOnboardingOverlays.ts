import { useAuthPrompt } from "./useAuthPrompt";
import { useCmdPaletteTutorial } from "./useCmdPaletteTutorial";
import { useOnboardingOverlay } from "./useOnboardingOverlay";

interface UseOnboardingOverlaysProps {
  tasks: Array<{ id: string }>;
  hasNavigatedDates: boolean;
}

interface UseOnboardingOverlaysReturn {
  showOnboardingOverlay: boolean;
  currentStep: number | null;
  showCmdPaletteTutorial: boolean;
  showAuthPrompt: boolean;
  dismissOnboardingOverlay: () => void;
  dismissCmdPaletteTutorial: () => void;
  dismissAuthPrompt: () => void;
  markCmdPaletteUsed: () => void;
}

/**
 * Composes multiple onboarding overlay hooks into a single hook
 * Manages the display logic for onboarding overlay, cmd palette tutorial, and auth prompt
 */
export function useOnboardingOverlays({
  tasks,
  hasNavigatedDates,
}: UseOnboardingOverlaysProps): UseOnboardingOverlaysReturn {
  const { showOnboardingOverlay, currentStep, dismissOnboardingOverlay } =
    useOnboardingOverlay();

  const {
    showCmdPaletteTutorial,
    dismissCmdPaletteTutorial,
    markCmdPaletteUsed,
  } = useCmdPaletteTutorial({
    showOnboardingOverlay,
  });

  const { showAuthPrompt, dismissAuthPrompt } = useAuthPrompt({
    tasks,
    hasNavigatedDates,
    showOnboardingOverlay,
    showCmdPaletteTutorial,
  });

  return {
    showOnboardingOverlay,
    currentStep,
    showCmdPaletteTutorial,
    showAuthPrompt,
    dismissOnboardingOverlay,
    dismissCmdPaletteTutorial,
    dismissAuthPrompt,
    markCmdPaletteUsed,
  };
}
