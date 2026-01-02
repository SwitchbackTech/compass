import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  clearCompletedSteps,
  getOnboardingProgress,
  isStepCompleted,
  loadCompletedSteps,
  markStepCompleted,
  saveCompletedSteps,
  updateOnboardingProgress,
} from "./onboardingStorage.util";

describe("onboardingStorage.util", () => {
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
        completedSteps: [1, 2],
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

    it("should filter out invalid steps from stored progress", () => {
      const invalidProgress = {
        completedSteps: [1, 2, 4, 5, 0, -1, "invalid"],
        isSeen: false,
        isAuthDismissed: false,
        isCompleted: false,
        isStorageWarningSeen: false,
      };
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        JSON.stringify(invalidProgress),
      );
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([1, 2, 4]);
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
      updateOnboardingProgress({ completedSteps: [1, 2] });
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([1, 2]);
    });

    it("should filter out invalid steps when updating", () => {
      updateOnboardingProgress({ completedSteps: [1, 2, 4, 5, 0, -1] });
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([1, 2, 4]);
    });
  });

  describe("loadCompletedSteps", () => {
    it("should return empty array when no steps are stored", () => {
      expect(loadCompletedSteps()).toEqual([]);
    });

    it("should return completed steps from onboarding progress", () => {
      updateOnboardingProgress({ completedSteps: [1, 2] });
      expect(loadCompletedSteps()).toEqual([1, 2]);
    });

    it("should filter out invalid steps", () => {
      updateOnboardingProgress({ completedSteps: [1, 2, 4, 5, 0, -1] });
      expect(loadCompletedSteps()).toEqual([1, 2, 4]);
    });
  });

  describe("saveCompletedSteps", () => {
    it("should save completed steps to onboarding progress", () => {
      saveCompletedSteps([1, 2]);
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([1, 2]);
    });

    it("should filter out invalid steps before saving", () => {
      saveCompletedSteps([1, 2, 4, 5, 0, -1]);
      const progress = getOnboardingProgress();
      expect(progress.completedSteps).toEqual([1, 2, 4]);
    });
  });

  describe("isStepCompleted", () => {
    it("should return false when step is not completed", () => {
      expect(isStepCompleted(1)).toBe(false);
    });

    it("should return true when step is completed", () => {
      saveCompletedSteps([1, 2]);
      expect(isStepCompleted(1)).toBe(true);
      expect(isStepCompleted(2)).toBe(true);
      expect(isStepCompleted(3)).toBe(false);
    });
  });

  describe("markStepCompleted", () => {
    it("should add step to completed steps", () => {
      markStepCompleted(1);
      expect(isStepCompleted(1)).toBe(true);
    });

    it("should not duplicate steps", () => {
      markStepCompleted(1);
      markStepCompleted(1);
      expect(loadCompletedSteps()).toEqual([1]);
    });

    it("should preserve existing completed steps", () => {
      saveCompletedSteps([1]);
      markStepCompleted(2);
      expect(loadCompletedSteps()).toEqual([1, 2]);
    });
  });

  describe("clearCompletedSteps", () => {
    it("should remove completed steps from localStorage", () => {
      saveCompletedSteps([1, 2, 3]);
      clearCompletedSteps();
      expect(loadCompletedSteps()).toEqual([]);
    });
  });
});
