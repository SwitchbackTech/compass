import { act, renderHook } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useHasCompletedSignup } from "./useHasCompletedSignup";

describe("useHasCompletedSignup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return false when localStorage is empty", () => {
    const { result } = renderHook(() => useHasCompletedSignup());

    expect(result.current.hasCompletedSignup).toBe(false);
  });

  it("should return true when localStorage has completed signup flag", () => {
    localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP, "true");

    const { result } = renderHook(() => useHasCompletedSignup());

    expect(result.current.hasCompletedSignup).toBe(true);
  });

  it("should return false when localStorage has invalid value", () => {
    localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP, "invalid");

    const { result } = renderHook(() => useHasCompletedSignup());

    expect(result.current.hasCompletedSignup).toBe(false);
  });

  it("should update hasCompletedSignup when markSignupCompleted is called", () => {
    const { result } = renderHook(() => useHasCompletedSignup());

    expect(result.current.hasCompletedSignup).toBe(false);

    act(() => {
      result.current.markSignupCompleted();
    });

    expect(result.current.hasCompletedSignup).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP)).toBe(
      "true",
    );
  });

  it("should handle multiple calls to markSignupCompleted", () => {
    const { result } = renderHook(() => useHasCompletedSignup());

    act(() => {
      result.current.markSignupCompleted();
    });

    expect(result.current.hasCompletedSignup).toBe(true);

    act(() => {
      result.current.markSignupCompleted();
    });

    expect(result.current.hasCompletedSignup).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP)).toBe(
      "true",
    );
  });
});
