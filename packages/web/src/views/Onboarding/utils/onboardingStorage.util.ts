import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

/**
 * Load completed steps from localStorage
 * Returns an array of completed step numbers (e.g., [1, 2])
 */
export function loadCompletedSteps(): number[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(
      STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
    );
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (step): step is number =>
          typeof step === "number" && step >= 1 && step <= 3,
      );
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save completed steps to localStorage
 */
export function saveCompletedSteps(steps: number[]): void {
  if (typeof window === "undefined") return;

  try {
    const validSteps = steps.filter(
      (step) => typeof step === "number" && step >= 1 && step <= 3,
    );
    localStorage.setItem(
      STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
      JSON.stringify(validSteps),
    );
  } catch {
    // Silently fail if localStorage is unavailable
  }
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
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Migrate existing CMD_PALETTE_GUIDE_COMPLETED flag to completed steps
 * If the guide is marked as completed, initialize with all steps completed
 */
export function migrateCompletedSteps(): void {
  if (typeof window === "undefined") return;

  try {
    const hasCompletedGuide =
      localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED) === "true";
    const hasCompletedSteps = localStorage.getItem(
      STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
    );

    // If guide is completed but we don't have completed steps yet, migrate
    if (hasCompletedGuide && !hasCompletedSteps) {
      saveCompletedSteps([1, 2, 3]);
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
