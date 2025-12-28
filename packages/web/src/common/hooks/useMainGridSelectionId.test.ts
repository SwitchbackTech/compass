import { act, renderHook } from "@testing-library/react";
import { selectionId$, useMainGridSelectionId } from "./useMainGridSelectionId";

describe("useMainGridSelectionId", () => {
  beforeEach(() => {
    act(() => {
      selectionId$.next(null);
    });
  });

  it("should return null initially", () => {
    const { result } = renderHook(() => useMainGridSelectionId());
    expect(result.current).toBeNull();
  });

  it("should update when selectionId$ emits a value", () => {
    const { result } = renderHook(() => useMainGridSelectionId());

    act(() => {
      selectionId$.next("test-id");
    });

    expect(result.current).toBe("test-id");
  });

  it("should update when selectionId$ emits null", () => {
    act(() => {
      selectionId$.next("test-id");
    });

    const { result } = renderHook(() => useMainGridSelectionId());

    expect(result.current).toBe("test-id");

    act(() => {
      selectionId$.next(null);
    });

    expect(result.current).toBeNull();
  });
});
