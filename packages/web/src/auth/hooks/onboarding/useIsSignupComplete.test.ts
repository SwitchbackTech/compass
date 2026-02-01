import { act } from "react";
import { renderHook } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { updateOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";
import { useIsSignupComplete } from "./useIsSignupComplete";

describe("useIsSignupComplete", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return false when localStorage is empty", () => {
    const { result } = renderHook(() => useIsSignupComplete());

    expect(result.current.isSignupComplete).toBe(false);
  });

  it("should return true when localStorage has completed signup flag", () => {
    updateOnboardingProgress({ isSignupComplete: true });

    const { result } = renderHook(() => useIsSignupComplete());

    expect(result.current.isSignupComplete).toBe(true);
  });

  it("should return false when localStorage has invalid value", () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_PROGRESS, "invalid");

    const { result } = renderHook(() => useIsSignupComplete());

    expect(result.current.isSignupComplete).toBe(false);
  });

  it("should update hasCompletedSignup when markSignupCompleted is called", () => {
    const { result } = renderHook(() => useIsSignupComplete());

    expect(result.current.isSignupComplete).toBe(false);

    act(() => {
      result.current.markSignupCompleted();
    });

    expect(result.current.isSignupComplete).toBe(true);
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS) ?? "{}",
    );
    expect(stored.isSignupComplete).toBe(true);
  });

  it("should handle multiple calls to markSignupCompleted", () => {
    const { result } = renderHook(() => useIsSignupComplete());

    act(() => {
      result.current.markSignupCompleted();
    });

    expect(result.current.isSignupComplete).toBe(true);

    act(() => {
      result.current.markSignupCompleted();
    });

    expect(result.current.isSignupComplete).toBe(true);
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS) ?? "{}",
    );
    expect(stored.isSignupComplete).toBe(true);
  });
});
