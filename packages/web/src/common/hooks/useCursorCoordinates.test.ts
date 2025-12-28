import { act } from "react";
import { renderHook } from "@testing-library/react";
import { cursor$ } from "@web/common/context/pointer-position";
import { useCursorCoordinates } from "./useCursorCoordinates";

describe("useCursorCoordinates", () => {
  beforeEach(() => {
    // Reset to a known state
    act(() => {
      cursor$.next({ x: 0, y: 0 });
    });
  });

  it("should return the initial cursor coordinates", () => {
    const { result } = renderHook(() => useCursorCoordinates());
    expect(result.current).toEqual({ x: 0, y: 0 });
  });

  it("should update coordinates when cursor$ emits new values", () => {
    const { result } = renderHook(() => useCursorCoordinates());

    act(() => {
      cursor$.next({ x: 100, y: 200 });
    });

    expect(result.current).toEqual({ x: 100, y: 200 });

    act(() => {
      cursor$.next({ x: 50, y: 50 });
    });

    expect(result.current).toEqual({ x: 50, y: 50 });
  });
});
