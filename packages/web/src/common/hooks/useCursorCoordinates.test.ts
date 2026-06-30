import { renderHook } from "@testing-library/react";
import { act } from "react";
import { cursorStore } from "@web/common/context/pointer-position";
import { useCursorCoordinates } from "./useCursorCoordinates";

describe("useCursorCoordinates", () => {
  beforeEach(() => {
    // Reset to a known state
    act(() => {
      cursorStore.set({ x: 0, y: 0 });
    });
  });

  it("should return the initial cursor coordinates", () => {
    const { result } = renderHook(() => useCursorCoordinates());
    expect(result.current).toEqual({ x: 0, y: 0 });
  });

  it("should update coordinates when the cursor store emits new values", () => {
    const { result } = renderHook(() => useCursorCoordinates());

    act(() => {
      cursorStore.set({ x: 100, y: 200 });
    });

    expect(result.current).toEqual({ x: 100, y: 200 });

    act(() => {
      cursorStore.set({ x: 50, y: 50 });
    });

    expect(result.current).toEqual({ x: 50, y: 50 });
  });
});
