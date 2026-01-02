import { act, renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { loadCompletedSteps } from "../utils/onboardingStorage.util";
import { useCmdPaletteGuide } from "./useCmdPaletteGuide";

describe("useCmdPaletteGuide", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize guide as active for new users", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(1);
  });

  it("should not initialize guide if already completed", () => {
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");

    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(false);
    expect(result.current.currentStep).toBe(null);
  });

  it("should persist step 1 completion to localStorage", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.completeStep(1);
    });

    expect(result.current.currentStep).toBe(2);
    expect(result.current.isGuideActive).toBe(true);
    expect(loadCompletedSteps()).toContain(1);
  });

  it("should advance to step 2 when step 1 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.completeStep(1);
    });

    expect(result.current.currentStep).toBe(2);
    expect(result.current.isGuideActive).toBe(true);
  });

  it("should advance to step 3 when step 2 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeStep(1);
    });

    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.completeStep(2);
    });

    expect(result.current.currentStep).toBe(3);
    expect(result.current.isGuideActive).toBe(true);
    expect(loadCompletedSteps()).toContain(2);
  });

  it("should complete guide when step 3 is completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeStep(1);
    });

    act(() => {
      result.current.completeStep(2);
    });

    expect(result.current.currentStep).toBe(3);

    act(() => {
      result.current.completeStep(3);
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED)).toBe(
      "true",
    );
    expect(loadCompletedSteps()).toContain(3);
  });

  it("should skip guide and clear completed steps", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(1);

    // Complete step 1 first
    act(() => {
      result.current.completeStep(1);
    });

    expect(loadCompletedSteps()).toContain(1);

    // Then skip
    act(() => {
      result.current.skipGuide();
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED)).toBe(
      "true",
    );
    expect(loadCompletedSteps()).toEqual([]);
  });

  it("should complete guide directly and mark all steps as completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeGuide();
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED)).toBe(
      "true",
    );
    expect(loadCompletedSteps()).toEqual([1, 2, 3]);
  });

  it("should resume from last completed step on remount", () => {
    const { result: firstRender } = renderHook(() => useCmdPaletteGuide());

    expect(firstRender.current.currentStep).toBe(1);

    act(() => {
      firstRender.current.completeStep(1);
    });

    expect(firstRender.current.currentStep).toBe(2);
    expect(loadCompletedSteps()).toContain(1);

    // Unmount and remount
    const { result: secondRender } = renderHook(() => useCmdPaletteGuide());

    // Should resume at step 2 (next incomplete step)
    expect(secondRender.current.currentStep).toBe(2);
    expect(secondRender.current.isGuideActive).toBe(true);
  });

  it("should migrate existing CMD_PALETTE_GUIDE_COMPLETED flag", () => {
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");

    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(false);
    expect(result.current.currentStep).toBe(null);
    expect(loadCompletedSteps()).toEqual([1, 2, 3]);
  });

  it("should handle window being undefined gracefully", () => {
    // The hook checks for typeof window === "undefined" internally
    // This test verifies the hook doesn't crash when window is checked
    // Note: We can't actually remove window in jsdom environment, but the hook
    // has guards in place to handle SSR scenarios
    const { result } = renderHook(() => useCmdPaletteGuide());

    // Should initialize guide normally in test environment
    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(1);
  });
});
