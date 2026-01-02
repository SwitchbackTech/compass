import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  clearCompletedSteps,
  loadCompletedSteps,
  markStepCompleted,
  migrateCompletedSteps,
} from "../utils/onboardingStorage.util";

export type GuideStep = 1 | 2 | 3 | null;

interface UseCmdPaletteGuideReturn {
  currentStep: GuideStep;
  isGuideActive: boolean;
  completeStep: (step: 1 | 2 | 3) => void;
  skipGuide: () => void;
  completeGuide: () => void;
}

/**
 * Hook to manage the Onboarding Guide state
 * Tracks current step and handles completion/skip
 * Persists completed steps across views and sessions
 */
export function useCmdPaletteGuide(): UseCmdPaletteGuideReturn {
  const [currentStep, setCurrentStep] = useState<GuideStep>(null);
  const [isGuideActive, setIsGuideActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Migrate existing CMD_PALETTE_GUIDE_COMPLETED flag to completed steps
    migrateCompletedSteps();

    const hasCompletedGuide =
      localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED) === "true";

    if (hasCompletedGuide) {
      setIsGuideActive(false);
      setCurrentStep(null);
      return;
    }

    // Load completed steps from localStorage
    const completedSteps = loadCompletedSteps();

    // Determine current step based on completed steps
    // Find the first incomplete step, or null if all are completed
    let nextStep: GuideStep = null;
    if (!completedSteps.includes(1)) {
      nextStep = 1;
    } else if (!completedSteps.includes(2)) {
      nextStep = 2;
    } else if (!completedSteps.includes(3)) {
      nextStep = 3;
    }

    if (nextStep !== null) {
      setIsGuideActive(true);
      setCurrentStep(nextStep);
    } else {
      // All steps completed, mark guide as completed
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
      setIsGuideActive(false);
      setCurrentStep(null);
    }
  }, []);

  const completeStep = useCallback((step: 1 | 2 | 3) => {
    // Mark step as completed in localStorage
    markStepCompleted(step);

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
      clearCompletedSteps();
    }
    setCurrentStep(null);
    setIsGuideActive(false);
  }, []);

  const completeGuide = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
      // Mark all steps as completed
      markStepCompleted(1);
      markStepCompleted(2);
      markStepCompleted(3);
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
