import { PointerEvent, act } from "react";
import { renderHook } from "@testing-library/react";
import {
  PointerState,
  pointerState$,
} from "@web/common/context/pointer-position";
import { usePointerState } from "@web/common/hooks/usePointerState";

const excludeEvent = (state: PointerState): Omit<PointerState, "event"> => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { event, ...rest } = state;
  return rest;
};

describe("usePointerState", () => {
  const mockEvent = new MouseEvent("none", {
    button: 1,
  }) as unknown as PointerEvent;
  const initialState: PointerState = {
    event: mockEvent,
    pointerdown: false,
    selectionStart: null,
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
      pointerState$.next(initialState);
    });
  });

  it("should return the initial state", () => {
    const { result } = renderHook(() => usePointerState());
    expect(result.current).toEqual(excludeEvent(initialState));
  });

  it("should update when mouseState$ emits new values", () => {
    const { result } = renderHook(() => usePointerState());

    const newState = {
      ...initialState,
      pointerdown: true,
      isOverGrid: true,
    };

    act(() => {
      pointerState$.next(newState);
    });

    expect(result.current).toEqual(excludeEvent(newState));
  });

  it("should handle updates to all properties", () => {
    const { result } = renderHook(() => usePointerState());

    const allTrueState: PointerState = {
      event: mockEvent,
      pointerdown: true,
      selectionStart: { clientX: 100, clientY: 200 },
      isOverGrid: true,
      isOverSidebar: true,
      isOverMainGrid: true,
      isOverSomedayWeek: true,
      isOverSomedayMonth: true,
      isOverAllDayRow: true,
    };

    act(() => {
      pointerState$.next(allTrueState);
    });

    expect(result.current).toEqual(excludeEvent(allTrueState));
  });
});
