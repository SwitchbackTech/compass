import { act } from "react";
import { renderHook } from "@testing-library/react";
import { mouseState$ } from "@web/common/context/mouse-position";
import { useMouseState } from "./useMouseState";

describe("useMouseState", () => {
  const initialState = {
    mousedown: false,
    isOverGrid: false,
    isOverSidebar: false,
    isOverMainGrid: false,
    isOverSomedayWeek: false,
    isOverSomedayMonth: false,
    isOverAllDayRow: false,
  };

  beforeEach(() => {
    // Reset the subject to initial state before each test
    act(() => {
      mouseState$.next(initialState);
    });
  });

  it("should return the initial state", () => {
    const { result } = renderHook(() => useMouseState());
    expect(result.current).toEqual(initialState);
  });

  it("should update when mouseState$ emits new values", () => {
    const { result } = renderHook(() => useMouseState());

    const newState = {
      ...initialState,
      mousedown: true,
      isOverGrid: true,
    };

    act(() => {
      mouseState$.next(newState);
    });

    expect(result.current).toEqual(newState);
  });

  it("should handle updates to all properties", () => {
    const { result } = renderHook(() => useMouseState());

    const allTrueState = {
      mousedown: true,
      isOverGrid: true,
      isOverSidebar: true,
      isOverMainGrid: true,
      isOverSomedayWeek: true,
      isOverSomedayMonth: true,
      isOverAllDayRow: true,
    };

    act(() => {
      mouseState$.next(allTrueState);
    });

    expect(result.current).toEqual(allTrueState);
  });
});
