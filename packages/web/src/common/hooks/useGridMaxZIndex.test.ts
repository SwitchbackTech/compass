import { renderHook } from "@testing-library/react";
import { act } from "react";
import { maxGridZIndexStore } from "@web/common/utils/dom/grid-organization.util";
import { useGridMaxZIndex } from "./useGridMaxZIndex";

describe("useGridMaxZIndex", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    act(() => {
      maxGridZIndexStore.set(0);
    });
  });

  it("should return the initial z-index", () => {
    const { result } = renderHook(() => useGridMaxZIndex());
    expect(result.current).toBe(0);
  });

  it("should update when maxGridZIndexStore emits a new value", () => {
    const { result } = renderHook(() => useGridMaxZIndex());

    act(() => {
      maxGridZIndexStore.set(10);
    });

    expect(result.current).toBe(10);
  });

  it("should not update if the value is the same (distinctUntilChanged)", () => {
    const { result } = renderHook(() => useGridMaxZIndex());

    act(() => {
      maxGridZIndexStore.set(5);
    });
    expect(result.current).toBe(5);

    // Emitting the same value again
    act(() => {
      maxGridZIndexStore.set(5);
    });
    expect(result.current).toBe(5);
  });

  it("should handle multiple updates", () => {
    const { result } = renderHook(() => useGridMaxZIndex());

    act(() => {
      maxGridZIndexStore.set(1);
    });
    expect(result.current).toBe(1);

    act(() => {
      maxGridZIndexStore.set(100);
    });
    expect(result.current).toBe(100);

    act(() => {
      maxGridZIndexStore.set(50);
    });
    expect(result.current).toBe(50);
  });
});
