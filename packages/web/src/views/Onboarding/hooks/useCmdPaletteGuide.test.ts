import { act } from "react";
import { renderHook } from "@testing-library/react";
import {
  ONBOARDING_RESTART_EVENT,
  ONBOARDING_STEPS,
} from "../constants/onboarding.constants";
import {
  getOnboardingProgress,
  loadCompletedSteps,
  resetOnboardingProgress,
  updateOnboardingProgress,
} from "../utils/onboarding.storage.util";
import { useCmdPaletteGuide } from "./useCmdPaletteGuide";

describe("useCmdPaletteGuide", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize guide as active for new users", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
  });

  it("should not initialize guide if already completed", () => {
    updateOnboardingProgress({ isCompleted: true });

    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(false);
    expect(result.current.currentStep).toBe(null);
    const progress = getOnboardingProgress();
    expect(progress.isCompleted).toBe(true);
  });

  it("should persist step 1 completion to localStorage", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);
    expect(result.current.isGuideActive).toBe(true);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
  });

  it("should advance to step 2 when step 1 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);
    expect(result.current.isGuideActive).toBe(true);
  });

  it("should advance to step 3 when step 2 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.CREATE_TASK);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    expect(result.current.isGuideActive).toBe(true);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.CREATE_TASK);
  });

  it("should advance to step 4 when step 3 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.CREATE_TASK);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_NOW);

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.EDIT_DESCRIPTION);
    expect(result.current.isGuideActive).toBe(true);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
  });

  it("should complete guide when step 6 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.CREATE_TASK);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.EDIT_DESCRIPTION);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.EDIT_REMINDER);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_WEEK);

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_WEEK);
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    const progress = getOnboardingProgress();
    expect(progress.isCompleted).toBe(true);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.NAVIGATE_TO_WEEK);
  });

  it("should skip guide and clear completed steps", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    // Complete step 1 first
    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    // Then skip
    act(() => {
      result.current.skipGuide();
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    const progress = getOnboardingProgress();
    expect(progress.isCompleted).toBe(true);
    expect(loadCompletedSteps()).toEqual([]);
  });

  it("should complete guide directly and mark all steps as completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeGuide();
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    const progress = getOnboardingProgress();
    expect(progress.isCompleted).toBe(true);
    // Steps are marked in the order defined in ONBOARDING_STEP_CONFIGS
    expect(loadCompletedSteps()).toEqual([
      ONBOARDING_STEPS.NAVIGATE_TO_DAY,
      ONBOARDING_STEPS.CREATE_TASK,
      ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      ONBOARDING_STEPS.EDIT_DESCRIPTION,
      ONBOARDING_STEPS.EDIT_REMINDER,
      ONBOARDING_STEPS.NAVIGATE_TO_WEEK,
    ]);
  });

  it("should resume from last completed step on remount", () => {
    const { result: firstRender } = renderHook(() => useCmdPaletteGuide());

    expect(firstRender.current.currentStep).toBe(
      ONBOARDING_STEPS.NAVIGATE_TO_DAY,
    );

    act(() => {
      firstRender.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(firstRender.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    // Unmount and remount
    const { result: secondRender } = renderHook(() => useCmdPaletteGuide());

    // Should resume at step 2 (next incomplete step)
    expect(secondRender.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);
    expect(secondRender.current.isGuideActive).toBe(true);
  });

  it("should handle window being undefined gracefully", () => {
    // The hook checks for typeof window === "undefined" internally
    // This test verifies the hook doesn't crash when window is checked
    // Note: We can't actually remove window in jsdom environment, but the hook
    // has guards in place to handle SSR scenarios
    const { result } = renderHook(() => useCmdPaletteGuide());

    // Should initialize guide normally in test environment
    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
  });

  it("should restart guide when restart event is dispatched", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    // Complete a few steps first
    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.CREATE_TASK);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    expect(loadCompletedSteps()).toContain(ONBOARDING_STEPS.CREATE_TASK);

    // Reset storage and dispatch restart event
    act(() => {
      resetOnboardingProgress();
      window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
    });

    // Should restart from the beginning
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    expect(result.current.isGuideActive).toBe(true);
    expect(loadCompletedSteps()).toEqual([]);
  });

  it("should restart guide even when guide is completed", () => {
    // Complete the entire guide first
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.CREATE_TASK);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.EDIT_DESCRIPTION);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.EDIT_REMINDER);
    });

    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_WEEK);
    });

    expect(result.current.isGuideActive).toBe(false);
    expect(result.current.currentStep).toBe(null);
    const progress = getOnboardingProgress();
    expect(progress.isCompleted).toBe(true);

    // Reset and restart
    act(() => {
      resetOnboardingProgress();
      window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
    });

    // Should restart from the beginning
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    expect(result.current.isGuideActive).toBe(true);
    const newProgress = getOnboardingProgress();
    expect(newProgress.isCompleted).toBe(false);
  });

  it("should handle multiple restart events", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    // Complete step 1
    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);

    // First restart
    act(() => {
      resetOnboardingProgress();
      window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    // Complete step 1 again
    act(() => {
      result.current.completeStep(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);

    // Second restart
    act(() => {
      resetOnboardingProgress();
      window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
    });

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    expect(result.current.isGuideActive).toBe(true);
  });
});
