import {
  DEFAULT_ONBOARDING_PROGRESS,
  OnboardingProgress,
} from "@web/common/constants/onboarding.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import {
  clearCompletedSteps,
  getOnboardingProgress,
  isStepCompleted,
  loadCompletedSteps,
  markStepCompleted,
  resetOnboardingProgress,
  saveCompletedSteps,
  updateOnboardingProgress,
} from "./onboarding.storage.util";

describe("onboarding.storage.util", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getOnboardingProgress", () => {
    it("should return default progress when no data exists", () => {
      const progress = getOnboardingProgress();
      expect(progress).toEqual(DEFAULT_ONBOARDING_PROGRESS);
    });

    it("should return stored progress from consolidated key", () => {
      const testProgress: OnboardingProgress = {
        completedSteps: [
          ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
        isSeen: true,
        isCompleted: false,
        isSignupComplete: true,
        isOnboardingSkipped: false,
        isAuthPromptDismissed: true,
      };
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        JSON.stringify(testProgress),
      );
      const progress = getOnboardingProgress();
      expect(progress).toEqual(testProgress);
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_PROGRESS, "invalid json");
      const progress = getOnboardingProgress();
      const expected: OnboardingProgress = {
        completedSteps: [],
        isSeen: false,
        isCompleted: false,
        isSignupComplete: false,
        isOnboardingSkipped: false,
        isAuthPromptDismissed: false,
      };
      expect(progress).toEqual(expected);
    });

    it("should handle invalid array format gracefully", () => {
      const invalidFormatProgress = {
        completedSteps: [1, 2, 4, 5, 0, -1, "invalid"],
        isSeen: false,
        isCompleted: false,
        hasCompletedSignup: false,
        skipOnboarding: false,
        authPromptDismissed: false,
      };
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        JSON.stringify(invalidFormatProgress),
      );
      const progress = getOnboardingProgress();
      // Invalid format should be rejected and return default empty array
      expect(progress.completedSteps).toEqual([]);
    });
  });

  describe("updateOnboardingProgress", () => {
    it("should update onboarding progress", () => {
      updateOnboardingProgress({ isSeen: true });
      const progress = getOnboardingProgress();
      expect(progress.isSeen).toBe(true);
    });

    it("should merge partial updates", () => {
      updateOnboardingProgress({ isSeen: true });
      updateOnboardingProgress({ isAuthPromptDismissed: true });
      const progress = getOnboardingProgress();
      expect(progress.isSeen).toBe(true);
      expect(progress.isAuthPromptDismissed).toBe(true);
    });

    it("should update completed steps", () => {
      updateOnboardingProgress({
        completedSteps: [
          ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
      });
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });
  });

  describe("loadCompletedSteps", () => {
    it("should return empty array when no steps are stored", () => {
      expect(loadCompletedSteps()).toEqual([]);
    });

    it("should return completed steps from onboarding progress", () => {
      updateOnboardingProgress({
        completedSteps: [
          ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
      });
      expect(loadCompletedSteps()).toEqual([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });

    it("should return all completed steps", () => {
      updateOnboardingProgress({
        completedSteps: [
          ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
          ONBOARDING_STEPS.EDIT_DESCRIPTION,
          ONBOARDING_STEPS.EDIT_REMINDER,
        ],
      });
      expect(loadCompletedSteps()).toEqual([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
        ONBOARDING_STEPS.EDIT_REMINDER,
      ]);
    });
  });

  describe("saveCompletedSteps", () => {
    it("should save completed steps to onboarding progress", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });

    it("should save all steps correctly", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
        ONBOARDING_STEPS.EDIT_REMINDER,
      ]);
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
        ONBOARDING_STEPS.EDIT_REMINDER,
      ]);
    });
  });

  describe("isStepCompleted", () => {
    it("should return false when step is not completed", () => {
      expect(isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY)).toBe(false);
    });

    it("should return true when step is completed", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
      expect(isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY)).toBe(true);
      expect(isStepCompleted(ONBOARDING_STEPS.CREATE_TASK)).toBe(true);
      expect(isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW)).toBe(true);
      expect(isStepCompleted(ONBOARDING_STEPS.EDIT_DESCRIPTION)).toBe(false);
    });
  });

  describe("markStepCompleted", () => {
    it("should add step to completed steps", () => {
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
      expect(isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY)).toBe(true);
    });

    it("should not duplicate steps", () => {
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
      expect(loadCompletedSteps()).toEqual([ONBOARDING_STEPS.NAVIGATE_TO_DAY]);
    });

    it("should preserve existing completed steps", () => {
      saveCompletedSteps([ONBOARDING_STEPS.NAVIGATE_TO_DAY]);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
      expect(loadCompletedSteps()).toEqual([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });
  });

  describe("clearCompletedSteps", () => {
    it("should remove completed steps from localStorage", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
      ]);
      clearCompletedSteps();
      expect(loadCompletedSteps()).toEqual([]);
    });
  });

  describe("resetOnboardingProgress", () => {
    it("should remove the onboarding progress key from localStorage", () => {
      // Set up some progress
      updateOnboardingProgress({
        completedSteps: [
          ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
        isSeen: true,
        isCompleted: true,
        isSignupComplete: true,
        isOnboardingSkipped: true,
        isAuthPromptDismissed: true,
      });

      // Verify it exists
      expect(
        localStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS),
      ).toBeTruthy();
      const progressBefore = getOnboardingProgress();
      expect(progressBefore.completedSteps.length).toBeGreaterThan(0);
      expect(progressBefore.isCompleted).toBe(true);

      // Reset
      resetOnboardingProgress();

      // Verify key is removed
      expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS)).toBeNull();

      // Verify getOnboardingProgress returns defaults
      const progressAfter = getOnboardingProgress();
      expect(progressAfter.completedSteps).toEqual([]);
      expect(progressAfter.isSeen).toBe(false);
      expect(progressAfter.isCompleted).toBe(false);
      expect(progressAfter.isSignupComplete).toBe(false);
      expect(progressAfter.isOnboardingSkipped).toBe(false);
      expect(progressAfter.isAuthPromptDismissed).toBe(false);
    });

    it("should handle reset when no progress exists", () => {
      // Ensure no progress exists
      localStorage.removeItem(STORAGE_KEYS.ONBOARDING_PROGRESS);

      // Should not throw
      expect(() => resetOnboardingProgress()).not.toThrow();

      // Should still return defaults
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([]);
      expect(progress.isCompleted).toBe(false);
    });
  });
});
