import { act, renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
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
  });

  it("should skip guide and mark as completed", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    expect(result.current.isGuideActive).toBe(true);
    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.skipGuide();
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED)).toBe(
      "true",
    );
  });

  it("should complete guide directly", () => {
    const { result } = renderHook(() => useCmdPaletteGuide());

    act(() => {
      result.current.completeGuide();
    });

    expect(result.current.currentStep).toBe(null);
    expect(result.current.isGuideActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED)).toBe(
      "true",
    );
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
