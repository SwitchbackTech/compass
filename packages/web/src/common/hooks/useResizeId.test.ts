import { act, renderHook } from "@testing-library/react";
import { resizeId$, useResizeId } from "./useResizeId";

describe("useResizeId", () => {
  beforeEach(() => {
    act(() => {
      resizeId$.next(null);
    });
  });

  it("should return null initially", () => {
    const { result } = renderHook(() => useResizeId());
    expect(result.current).toBeNull();
  });

  it("should update when resizeId$ emits a value", () => {
    const { result } = renderHook(() => useResizeId());

    act(() => {
      resizeId$.next("test-id");
    });

    expect(result.current).toBe("test-id");
  });

  it("should update when resizeId$ emits null", () => {
    act(() => {
      resizeId$.next("test-id");
    });

    const { result } = renderHook(() => useResizeId());

    expect(result.current).toBe("test-id");

    act(() => {
      resizeId$.next(null);
    });

    expect(result.current).toBeNull();
  });
});
