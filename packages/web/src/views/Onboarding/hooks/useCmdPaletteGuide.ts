import { useCallback, useEffect, useState } from "react";
import {
  ONBOARDING_STEPS,
  type OnboardingStepName,
} from "../constants/onboarding.constants";
import {
  clearCompletedSteps,
  getOnboardingProgress,
  markStepCompleted,
  updateOnboardingProgress,
} from "../utils/onboardingStorage.util";

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
    // Find the first incomplete step, or null if all are completed
    let nextStep: GuideStep = null;
    if (!completedSteps.createTask) {
      nextStep = ONBOARDING_STEPS.CREATE_TASK;
    } else if (!completedSteps.navigateToNow) {
      nextStep = ONBOARDING_STEPS.NAVIGATE_TO_NOW;
    } else if (!completedSteps.editDescription) {
      nextStep = ONBOARDING_STEPS.EDIT_DESCRIPTION;
    } else if (!completedSteps.editReminder) {
      nextStep = ONBOARDING_STEPS.EDIT_REMINDER;
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

    if (step === ONBOARDING_STEPS.EDIT_REMINDER) {
      // All steps completed
      if (typeof window !== "undefined") {
        updateOnboardingProgress({ isCompleted: true });
      }
      setCurrentStep(null);
      setIsGuideActive(false);
    } else {
      // Move to next step
      const stepOrder = [
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
        ONBOARDING_STEPS.EDIT_REMINDER,
      ];
      const currentIndex = stepOrder.indexOf(step);
      if (currentIndex !== -1 && currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1]);
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
      // Mark all steps as completed
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
      markStepCompleted(ONBOARDING_STEPS.EDIT_DESCRIPTION);
      markStepCompleted(ONBOARDING_STEPS.EDIT_REMINDER);
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
