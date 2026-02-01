import {
  DEFAULT_ONBOARDING_PROGRESS,
  OnboardingProgress,
  OnboardingProgressSchema,
} from "@web/common/constants/onboarding.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import type { OnboardingStepName } from "../constants/onboarding.constants";

export function getOnboardingProgress(): OnboardingProgress {
  if (typeof window === "undefined") return DEFAULT_ONBOARDING_PROGRESS;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS);
    if (stored) {
      const parsed = JSON.parse(stored);
      const result = OnboardingProgressSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    }

    return DEFAULT_ONBOARDING_PROGRESS;
  } catch {
    return DEFAULT_ONBOARDING_PROGRESS;
  }
}

/**
 * Update onboarding progress in localStorage
 * Merges partial updates into existing progress
 */
export function updateOnboardingProgress(
  updates: Partial<OnboardingProgress>,
): void {
  if (typeof window === "undefined") return;

  try {
    const current = getOnboardingProgress();
    const updated: OnboardingProgress = {
      ...current,
      ...updates,
      completedSteps: updates.completedSteps ?? current.completedSteps,
    };

    // Validate with zod schema
    const result = OnboardingProgressSchema.safeParse(updated);
    if (result.success) {
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        JSON.stringify(result.data),
      );
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Load completed steps from onboarding progress
 * Returns an array of completed step names (e.g., ["createTask", "navigateToNow"])
 */
export function loadCompletedSteps(): OnboardingStepName[] {
  const progress = getOnboardingProgress();
  return progress.completedSteps;
}

/**
 * Save completed steps to onboarding progress
 */
export function saveCompletedSteps(steps: OnboardingStepName[]): void {
  updateOnboardingProgress({
    completedSteps: steps,
  });
}

/**
 * Check if a specific step is completed
 */
export function isStepCompleted(step: OnboardingStepName): boolean {
  const progress = getOnboardingProgress();
  return progress.completedSteps.includes(step);
}

/**
 * Mark a step as completed
 */
export function markStepCompleted(step: OnboardingStepName): void {
  const progress = getOnboardingProgress();
  if (!progress.completedSteps.includes(step)) {
    const updated = [...progress.completedSteps, step];
    updateOnboardingProgress({ completedSteps: updated });
  }
}

/**
 * Clear all completed steps (used for skip/reset)
 */
export function clearCompletedSteps(): void {
  updateOnboardingProgress({
    completedSteps: [],
  });
}

/**
 * Reset onboarding progress by removing the localStorage key
 * This completely clears all onboarding state
 */
export function resetOnboardingProgress(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_PROGRESS);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
