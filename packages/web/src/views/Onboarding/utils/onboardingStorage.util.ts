import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export const OnboardingProgressSchema = z.object({
  completedSteps: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return [];
      return val.filter(
        (step): step is number =>
          typeof step === "number" &&
          Number.isInteger(step) &&
          step >= 1 &&
          step <= 3,
      );
    },
    z.array(z.number().int().min(1).max(3)).default([]),
  ),
  isSeen: z.boolean().default(false),
  isAuthDismissed: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  isStorageWarningSeen: z.boolean().default(false),
});

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  completedSteps: [],
  isSeen: false,
  isAuthDismissed: false,
  isCompleted: false,
  isStorageWarningSeen: false,
};

/**
 * Get onboarding progress from localStorage
 */
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
 * Returns an array of completed step numbers (e.g., [1, 2])
 */
export function loadCompletedSteps(): number[] {
  return getOnboardingProgress().completedSteps;
}

/**
 * Save completed steps to onboarding progress
 */
export function saveCompletedSteps(steps: number[]): void {
  updateOnboardingProgress({ completedSteps: steps });
}

/**
 * Check if a specific step is completed
 */
export function isStepCompleted(step: number): boolean {
  const completedSteps = loadCompletedSteps();
  return completedSteps.includes(step);
}

/**
 * Mark a step as completed
 */
export function markStepCompleted(step: number): void {
  const completedSteps = loadCompletedSteps();
  if (!completedSteps.includes(step)) {
    saveCompletedSteps([...completedSteps, step]);
  }
}

/**
 * Clear all completed steps (used for skip/reset)
 */
export function clearCompletedSteps(): void {
  updateOnboardingProgress({ completedSteps: [] });
}
