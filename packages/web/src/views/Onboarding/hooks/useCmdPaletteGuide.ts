import { useCallback, useEffect, useState } from "react";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_CONFIGS,
  type OnboardingStepName,
} from "../constants/onboarding.constants";
import {
  clearCompletedSteps,
  getOnboardingProgress,
  markStepCompleted,
  updateOnboardingProgress,
} from "../utils/onboarding.storage.util";

export type GuideStep = OnboardingStepName | null;

interface UseCmdPaletteGuideReturn {
  currentStep: GuideStep;
  isGuideActive: boolean;
  completeStep: (step: OnboardingStepName) => void;
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

    const progress = getOnboardingProgress();

    if (progress.isCompleted) {
      setIsGuideActive(false);
      setCurrentStep(null);
      return;
    }

    // Load completed steps from onboarding progress
    const completedSteps = progress.completedSteps;

    // Determine current step based on completed steps
    // Find the first incomplete step using ordered configuration
    let nextStep: GuideStep = null;
    for (const stepConfig of ONBOARDING_STEP_CONFIGS) {
      if (!completedSteps.includes(stepConfig.id)) {
        nextStep = stepConfig.id;
        break;
      }
    }

    if (nextStep !== null) {
      setIsGuideActive(true);
      setCurrentStep(nextStep);
    } else {
      // All steps completed, mark guide as completed
      updateOnboardingProgress({ isCompleted: true });
      setIsGuideActive(false);
      setCurrentStep(null);
    }
  }, []);

  const completeStep = useCallback((step: OnboardingStepName) => {
    // Mark step as completed in onboarding progress
    markStepCompleted(step);

    // Find current step index in ordered configuration
    const currentStepIndex = ONBOARDING_STEP_CONFIGS.findIndex(
      (config) => config.id === step,
    );

    // Check if this is the last step
    const isLastStep = currentStepIndex === ONBOARDING_STEP_CONFIGS.length - 1;

    if (isLastStep) {
      // All steps completed
      if (typeof window !== "undefined") {
        updateOnboardingProgress({ isCompleted: true });
      }
      setCurrentStep(null);
      setIsGuideActive(false);
    } else {
      // Move to next step
      const nextStepConfig = ONBOARDING_STEP_CONFIGS[currentStepIndex + 1];
      if (nextStepConfig) {
        setCurrentStep(nextStepConfig.id);
      }
    }
  }, []);

  const skipGuide = useCallback(() => {
    if (typeof window !== "undefined") {
      updateOnboardingProgress({ isCompleted: true });
      clearCompletedSteps();
    }
    setCurrentStep(null);
    setIsGuideActive(false);
  }, []);

  const completeGuide = useCallback(() => {
    if (typeof window !== "undefined") {
      updateOnboardingProgress({ isCompleted: true });
      // Mark all steps as completed using ordered configuration
      ONBOARDING_STEP_CONFIGS.forEach((config) => {
        markStepCompleted(config.id);
      });
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
