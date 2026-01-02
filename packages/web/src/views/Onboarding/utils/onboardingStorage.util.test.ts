import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  clearCompletedSteps,
  isStepCompleted,
  loadCompletedSteps,
  markStepCompleted,
  migrateCompletedSteps,
  saveCompletedSteps,
} from "./onboardingStorage.util";

describe("onboardingStorage.util", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadCompletedSteps", () => {
    it("should return empty array when no steps are stored", () => {
      expect(loadCompletedSteps()).toEqual([]);
    });

    it("should return completed steps from localStorage", () => {
      localStorage.setItem(
        STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
        JSON.stringify([1, 2]),
      );
      expect(loadCompletedSteps()).toEqual([1, 2]);
    });

    it("should filter out invalid steps", () => {
      localStorage.setItem(
        STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
        JSON.stringify([1, 2, 4, 0, -1, "invalid"]),
      );
      expect(loadCompletedSteps()).toEqual([1, 2]);
    });

    it("should return empty array for invalid JSON", () => {
      localStorage.setItem(
        STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
        "invalid json",
      );
      expect(loadCompletedSteps()).toEqual([]);
    });
  });

  describe("saveCompletedSteps", () => {
    it("should save completed steps to localStorage", () => {
      saveCompletedSteps([1, 2]);
      const stored = localStorage.getItem(
        STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
      );
      expect(JSON.parse(stored!)).toEqual([1, 2]);
    });

    it("should filter out invalid steps before saving", () => {
      saveCompletedSteps([1, 2, 4, 0, -1]);
      const stored = localStorage.getItem(
        STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED_STEPS,
      );
      expect(JSON.parse(stored!)).toEqual([1, 2]);
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

  describe("migrateCompletedSteps", () => {
    it("should migrate existing CMD_PALETTE_GUIDE_COMPLETED flag to completed steps", () => {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
      migrateCompletedSteps();
      expect(loadCompletedSteps()).toEqual([1, 2, 3]);
    });

    it("should not overwrite existing completed steps", () => {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
      saveCompletedSteps([1, 2]);
      migrateCompletedSteps();
      expect(loadCompletedSteps()).toEqual([1, 2]);
    });

    it("should not migrate if guide is not completed", () => {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "false");
      migrateCompletedSteps();
      expect(loadCompletedSteps()).toEqual([]);
    });
  });
});
