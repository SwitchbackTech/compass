import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  ONBOARDING_STEPS,
  type OnboardingStepName,
} from "../constants/onboarding.constants";

const CompletedStepsSchema = z
  .object({
    createTask: z.boolean().default(false),
    navigateToNow: z.boolean().default(false),
    editDescription: z.boolean().default(false),
    cmdPaletteInfo: z.boolean().default(false),
    editReminder: z.boolean().default(false),
    navigateToWeek: z.boolean().default(false),
  })
  .default({});

export const OnboardingProgressSchema = z.object({
  completedSteps: z.preprocess((val) => {
    // Handle old array format - return empty object (no migration needed)
    if (Array.isArray(val)) {
      return {};
    }
    // Handle new object format
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return val;
    }
    return {};
  }, CompletedStepsSchema),
  isSeen: z.boolean().default(false),
  isAuthDismissed: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  isStorageWarningSeen: z.boolean().default(false),
});

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  completedSteps: {
    createTask: false,
    navigateToNow: false,
    editDescription: false,
    cmdPaletteInfo: false,
    editReminder: false,
    navigateToWeek: false,
  },
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
 * Returns an array of completed step names (e.g., ["createTask", "navigateToNow"])
 */
export function loadCompletedSteps(): OnboardingStepName[] {
  const progress = getOnboardingProgress();
  const completed: OnboardingStepName[] = [];
  if (progress.completedSteps.createTask) {
    completed.push(ONBOARDING_STEPS.CREATE_TASK);
  }
  if (progress.completedSteps.navigateToNow) {
    completed.push(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
  }
  if (progress.completedSteps.editDescription) {
    completed.push(ONBOARDING_STEPS.EDIT_DESCRIPTION);
  }
  if (progress.completedSteps.cmdPaletteInfo) {
    completed.push(ONBOARDING_STEPS.CMD_PALETTE_INFO);
  }
  if (progress.completedSteps.editReminder) {
    completed.push(ONBOARDING_STEPS.EDIT_REMINDER);
  }
  if (progress.completedSteps.navigateToWeek) {
    completed.push(ONBOARDING_STEPS.NAVIGATE_TO_WEEK);
  }
  return completed;
}

/**
 * Save completed steps to onboarding progress
 */
export function saveCompletedSteps(steps: OnboardingStepName[]): void {
  updateOnboardingProgress({
    completedSteps: {
      createTask: steps.includes(ONBOARDING_STEPS.CREATE_TASK),
      navigateToNow: steps.includes(ONBOARDING_STEPS.NAVIGATE_TO_NOW),
      editDescription: steps.includes(ONBOARDING_STEPS.EDIT_DESCRIPTION),
      cmdPaletteInfo: steps.includes(ONBOARDING_STEPS.CMD_PALETTE_INFO),
      editReminder: steps.includes(ONBOARDING_STEPS.EDIT_REMINDER),
      navigateToWeek: steps.includes(ONBOARDING_STEPS.NAVIGATE_TO_WEEK),
    },
  });
}

/**
 * Check if a specific step is completed
 */
export function isStepCompleted(step: OnboardingStepName): boolean {
  const progress = getOnboardingProgress();
  switch (step) {
    case ONBOARDING_STEPS.CREATE_TASK:
      return progress.completedSteps.createTask;
    case ONBOARDING_STEPS.NAVIGATE_TO_NOW:
      return progress.completedSteps.navigateToNow;
    case ONBOARDING_STEPS.EDIT_DESCRIPTION:
      return progress.completedSteps.editDescription;
    case ONBOARDING_STEPS.CMD_PALETTE_INFO:
      return progress.completedSteps.cmdPaletteInfo;
    case ONBOARDING_STEPS.EDIT_REMINDER:
      return progress.completedSteps.editReminder;
    case ONBOARDING_STEPS.NAVIGATE_TO_WEEK:
      return progress.completedSteps.navigateToWeek;
    default:
      return false;
  }
}

/**
 * Mark a step as completed
 */
export function markStepCompleted(step: OnboardingStepName): void {
  const progress = getOnboardingProgress();
  const updated = { ...progress.completedSteps };
  switch (step) {
    case ONBOARDING_STEPS.CREATE_TASK:
      updated.createTask = true;
      break;
    case ONBOARDING_STEPS.NAVIGATE_TO_NOW:
      updated.navigateToNow = true;
      break;
    case ONBOARDING_STEPS.EDIT_DESCRIPTION:
      updated.editDescription = true;
      break;
    case ONBOARDING_STEPS.CMD_PALETTE_INFO:
      updated.cmdPaletteInfo = true;
      break;
    case ONBOARDING_STEPS.EDIT_REMINDER:
      updated.editReminder = true;
      break;
    case ONBOARDING_STEPS.NAVIGATE_TO_WEEK:
      updated.navigateToWeek = true;
      break;
  }
  updateOnboardingProgress({ completedSteps: updated });
}

/**
 * Clear all completed steps (used for skip/reset)
 */
export function clearCompletedSteps(): void {
  updateOnboardingProgress({
    completedSteps: {
      createTask: false,
      navigateToNow: false,
      editDescription: false,
      cmdPaletteInfo: false,
      editReminder: false,
      navigateToWeek: false,
    },
  });
}
