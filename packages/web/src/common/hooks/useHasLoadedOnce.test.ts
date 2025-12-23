import { renderHook } from "@testing-library/react";
import { useHasLoadedOnce } from "./useHasLoadedOnce";

describe("useHasLoadedOnce", () => {
  it("should initialize as false", () => {
    const { result } = renderHook(() => useHasLoadedOnce(true));
    expect(result.current.current).toBe(false);
  });

  it("should remain false while loading", () => {
    const { result } = renderHook(() => useHasLoadedOnce(true));
    expect(result.current.current).toBe(false);
  });

  it("should become true when loading finishes", () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useHasLoadedOnce(isLoading),
      {
        initialProps: { isLoading: true },
      },
    );

    expect(result.current.current).toBe(false);

    rerender({ isLoading: false });

    expect(result.current.current).toBe(true);
  });

  it("should remain true if loading starts again", () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useHasLoadedOnce(isLoading),
      {
        initialProps: { isLoading: true },
      },
    );

    rerender({ isLoading: false });
    expect(result.current.current).toBe(true);

    rerender({ isLoading: true });
    expect(result.current.current).toBe(true);
  });

  it("should respect the condition parameter", () => {
    const { result, rerender } = renderHook(
      ({ isLoading, condition }) => useHasLoadedOnce(isLoading, condition),
      {
        initialProps: { isLoading: true, condition: false },
      },
    );

    // Loading finishes, but condition is false
    rerender({ isLoading: false, condition: false });
    expect(result.current.current).toBe(false);

    // Condition becomes true
    rerender({ isLoading: false, condition: true });
    expect(result.current.current).toBe(true);
  });

  it("should handle condition being true initially", () => {
    const { result } = renderHook(() => useHasLoadedOnce(false, true));
    expect(result.current.current).toBe(true);
  });
});
