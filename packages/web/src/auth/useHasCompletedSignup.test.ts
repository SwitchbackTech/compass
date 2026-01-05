import { act, renderHook } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { updateAuthStorage } from "@web/common/utils/storage/auth.storage.util";
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
    updateAuthStorage({ hasCompletedSignup: true });

    const { result } = renderHook(() => useHasCompletedSignup());

    expect(result.current.hasCompletedSignup).toBe(true);
  });

  it("should return false when localStorage has invalid value", () => {
    localStorage.setItem(STORAGE_KEYS.AUTH, "invalid");

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
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) ?? "{}");
    expect(stored.hasCompletedSignup).toBe(true);
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
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) ?? "{}");
    expect(stored.hasCompletedSignup).toBe(true);
  });
});
