import { act, renderHook } from "@testing-library/react";
import { isDraggingEvent$, useIsDraggingEvent } from "./useIsDraggingEvent";

describe("useIsDraggingEvent", () => {
  beforeEach(() => {
    act(() => {
      isDraggingEvent$.next(false);
    });
  });

  it("should return false initially", () => {
    const { result } = renderHook(() => useIsDraggingEvent());
    expect(result.current).toBe(false);
  });

  it("should update when isDraggingEvent$ emits true", () => {
    const { result } = renderHook(() => useIsDraggingEvent());

    act(() => {
      isDraggingEvent$.next(true);
    });

    expect(result.current).toBe(true);
  });

  it("should update when isDraggingEvent$ emits false", () => {
    act(() => {
      isDraggingEvent$.next(true);
    });

    const { result } = renderHook(() => useIsDraggingEvent());

    expect(result.current).toBe(true);

    act(() => {
      isDraggingEvent$.next(false);
    });

    expect(result.current).toBe(false);
  });
});
