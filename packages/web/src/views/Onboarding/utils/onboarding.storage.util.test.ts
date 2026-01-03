import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import {
  clearCompletedSteps,
  getOnboardingProgress,
  isStepCompleted,
  loadCompletedSteps,
  markStepCompleted,
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
      expect(progress).toEqual({
        completedSteps: [],
        isSeen: false,
        isAuthDismissed: false,
        isCompleted: false,
        isStorageWarningSeen: false,
      });
    });

    it("should return stored progress from consolidated key", () => {
      const testProgress = {
        completedSteps: [
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
        isSeen: true,
        isAuthDismissed: true,
        isCompleted: false,
        isStorageWarningSeen: true,
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
      expect(progress).toEqual({
        completedSteps: [],
        isSeen: false,
        isAuthDismissed: false,
        isCompleted: false,
        isStorageWarningSeen: false,
      });
    });

    it("should handle invalid array format gracefully", () => {
      const invalidFormatProgress = {
        completedSteps: [1, 2, 4, 5, 0, -1, "invalid"],
        isSeen: false,
        isAuthDismissed: false,
        isCompleted: false,
        isStorageWarningSeen: false,
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
      updateOnboardingProgress({ isAuthDismissed: true });
      const progress = getOnboardingProgress();
      expect(progress.isSeen).toBe(true);
      expect(progress.isAuthDismissed).toBe(true);
    });

    it("should update completed steps", () => {
      updateOnboardingProgress({
        completedSteps: [
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
      });
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([
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
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ],
      });
      expect(loadCompletedSteps()).toEqual([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });

    it("should return all completed steps", () => {
      updateOnboardingProgress({
        completedSteps: [
          ONBOARDING_STEPS.CREATE_TASK,
          ONBOARDING_STEPS.NAVIGATE_TO_NOW,
          ONBOARDING_STEPS.EDIT_DESCRIPTION,
          ONBOARDING_STEPS.EDIT_REMINDER,
        ],
      });
      expect(loadCompletedSteps()).toEqual([
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
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });

    it("should save all steps correctly", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
        ONBOARDING_STEPS.EDIT_REMINDER,
      ]);
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
        ONBOARDING_STEPS.EDIT_REMINDER,
      ]);
    });
  });

  describe("isStepCompleted", () => {
    it("should return false when step is not completed", () => {
      expect(isStepCompleted(ONBOARDING_STEPS.CREATE_TASK)).toBe(false);
    });

    it("should return true when step is completed", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
      expect(isStepCompleted(ONBOARDING_STEPS.CREATE_TASK)).toBe(true);
      expect(isStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW)).toBe(true);
      expect(isStepCompleted(ONBOARDING_STEPS.EDIT_DESCRIPTION)).toBe(false);
    });
  });

  describe("markStepCompleted", () => {
    it("should add step to completed steps", () => {
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
      expect(isStepCompleted(ONBOARDING_STEPS.CREATE_TASK)).toBe(true);
    });

    it("should not duplicate steps", () => {
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
      expect(loadCompletedSteps()).toEqual([ONBOARDING_STEPS.CREATE_TASK]);
    });

    it("should preserve existing completed steps", () => {
      saveCompletedSteps([ONBOARDING_STEPS.CREATE_TASK]);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
      expect(loadCompletedSteps()).toEqual([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ]);
    });
  });

  describe("clearCompletedSteps", () => {
    it("should remove completed steps from localStorage", () => {
      saveCompletedSteps([
        ONBOARDING_STEPS.CREATE_TASK,
        ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        ONBOARDING_STEPS.EDIT_DESCRIPTION,
      ]);
      clearCompletedSteps();
      expect(loadCompletedSteps()).toEqual([]);
    });
  });
});
