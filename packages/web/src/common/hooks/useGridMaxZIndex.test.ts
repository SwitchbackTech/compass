import { act } from "react";
import { renderHook } from "@testing-library/react";
import { maxGridZIndex$ } from "@web/common/utils/dom/grid-organization.util";
import { useGridMaxZIndex } from "./useGridMaxZIndex";

describe("useGridMaxZIndex", () => {
  beforeEach(() => {
    // Reset the subject to initial state before each test
    act(() => {
      maxGridZIndex$.next(0);
    });
  });

  it("should return the initial z-index", () => {
    const { result } = renderHook(() => useGridMaxZIndex());
    expect(result.current).toBe(0);
  });

  it("should update when maxGridZIndex$ emits a new value", () => {
    const { result } = renderHook(() => useGridMaxZIndex());

    act(() => {
      maxGridZIndex$.next(10);
    });

    expect(result.current).toBe(10);
  });

  it("should not update if the value is the same (distinctUntilChanged)", () => {
    const { result } = renderHook(() => useGridMaxZIndex());

    act(() => {
      maxGridZIndex$.next(5);
    });
    expect(result.current).toBe(5);

    // Emitting the same value again
    act(() => {
      maxGridZIndex$.next(5);
    });
    expect(result.current).toBe(5);
  });

  it("should handle multiple updates", () => {
    const { result } = renderHook(() => useGridMaxZIndex());

    act(() => {
      maxGridZIndex$.next(1);
    });
    expect(result.current).toBe(1);

    act(() => {
      maxGridZIndex$.next(100);
    });
    expect(result.current).toBe(100);

    act(() => {
      maxGridZIndex$.next(50);
    });
    expect(result.current).toBe(50);
  });
});
