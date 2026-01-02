import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export type GuideStep = 1 | 2 | 3 | null;

interface UseCmdPaletteGuideReturn {
  currentStep: GuideStep;
  isGuideActive: boolean;
  completeStep: (step: 1 | 2 | 3) => void;
  skipGuide: () => void;
  completeGuide: () => void;
}

/**
 * Hook to manage the command palette guide state
 * Tracks current step and handles completion/skip
 */
export function useCmdPaletteGuide(): UseCmdPaletteGuideReturn {
  const [currentStep, setCurrentStep] = useState<GuideStep>(null);
  const [isGuideActive, setIsGuideActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasCompletedGuide =
      localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED) === "true";

    if (!hasCompletedGuide) {
      setIsGuideActive(true);
      setCurrentStep(1);
    }
  }, []);

  const completeStep = useCallback((step: 1 | 2 | 3) => {
    if (step === 3) {
      // All steps completed
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
      }
      setCurrentStep(null);
      setIsGuideActive(false);
    } else {
      // Move to next step
      setCurrentStep((step + 1) as GuideStep);
    }
  }, []);

  const skipGuide = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
    }
    setCurrentStep(null);
    setIsGuideActive(false);
  }, []);

  const completeGuide = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
    }
    setCurrentStep(null);
    setIsGuideActive(false);
  }, []);

  return {
    currentStep,
    isGuideActive,
    completeStep,
    skipGuide,
    completeGuide,
  };
}
