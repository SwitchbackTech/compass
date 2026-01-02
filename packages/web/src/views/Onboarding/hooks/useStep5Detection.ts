import { useEffect } from "react";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import type { OnboardingStepName } from "../constants/onboarding.constants";
import { isStepCompleted } from "../utils/onboardingStorage.util";

interface UseStep5DetectionProps {
  currentStep: OnboardingStepName | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 5 completion: opening command palette with cmd+k
 * Monitors cmd palette state from Redux store
 * Skips detection if step is already completed
 */
export function useStep5Detection({
  currentStep,
  onStepComplete,
}: UseStep5DetectionProps): void {
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);

  useEffect(() => {
    if (currentStep !== ONBOARDING_STEPS.CMD_PALETTE_INFO) {
      // Reset when not on step 5
      return;
    }

    // Skip detection if step is already completed
    if (isStepCompleted(ONBOARDING_STEPS.CMD_PALETTE_INFO)) {
      return;
    }

    // Detect when cmd palette is opened
    if (isCmdPaletteOpen) {
      onStepComplete();
    }
  }, [currentStep, isCmdPaletteOpen, onStepComplete]);
}
