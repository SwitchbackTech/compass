import React, { act } from "react";
import { renderHook } from "@testing-library/react";
import {
  MousePositionContext,
  cursor$,
  mouseState$,
} from "@web/common/context/mouse-position";
import {
  useCursorCoordinates,
  useMousePosition,
  useMouseState,
  useOpenAtCursorPosition,
} from "./useMousePosition";

// Mock @floating-ui/react
jest.mock("@floating-ui/react", () => ({
  useFloating: jest.fn(() => ({
    context: {},
    x: 0,
    y: 0,
    placement: "right-start",
    strategy: "fixed",
    refs: {
      setFloating: jest.fn(),
      setReference: jest.fn(),
    },
  })),
  useDismiss: jest.fn(),
  useInteractions: jest.fn(() => ({
    getFloatingProps: jest.fn(),
  })),
  autoUpdate: jest.fn(),
  flip: jest.fn(),
  offset: jest.fn(),
  shift: jest.fn(),
}));

describe("useMousePosition hooks", () => {
  beforeEach(() => {
    // Reset subjects
    mouseState$.next({
      mousedown: false,
      isOverGrid: false,
      isOverSidebar: false,
      isOverMainGrid: false,
      isOverSomedayWeek: false,
      isOverSomedayMonth: false,
      isOverAllDayRow: false,
    });
    cursor$.next({ x: 0, y: 0 });
  });

  describe("useMousePosition", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for the expected error
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMousePosition());
      }).toThrow(
        "useMousePosition must be used within the MousePositionProvider",
      );

      consoleSpy.mockRestore();
    });

    it("should return context value when used within provider", () => {
      const mockContext = { toggleMouseMovementTracking: jest.fn() };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MousePositionContext.Provider value={mockContext}>
          {children}
        </MousePositionContext.Provider>
      );

      const { result } = renderHook(() => useMousePosition(), { wrapper });
      expect(result.current).toBe(mockContext);
    });
  });

  describe("useMouseState", () => {
    it("should return initial state", () => {
      const { result } = renderHook(() => useMouseState());
      expect(result.current).toEqual(
        expect.objectContaining({
          mousedown: false,
          isOverGrid: false,
        }),
      );
    });

    it("should update state when mouseState$ emits", () => {
      const { result } = renderHook(() => useMouseState());

      act(() => {
        mouseState$.next({
          mousedown: true,
          isOverGrid: true,
          isOverSidebar: true,
          isOverMainGrid: true,
          isOverSomedayWeek: true,
          isOverSomedayMonth: true,
          isOverAllDayRow: true,
        });
      });

      expect(result.current).toEqual({
        mousedown: true,
        isOverGrid: true,
        isOverSidebar: true,
        isOverMainGrid: true,
        isOverSomedayWeek: true,
        isOverSomedayMonth: true,
        isOverAllDayRow: true,
      });
    });
  });

  describe("useCursorCoordinates", () => {
    it("should return initial coordinates", () => {
      const { result } = renderHook(() => useCursorCoordinates());
      expect(result.current).toEqual({ x: 0, y: 0 });
    });

    it("should update coordinates when cursor$ emits", () => {
      const { result } = renderHook(() => useCursorCoordinates());

      act(() => {
        cursor$.next({ x: 100, y: 200 });
      });

      expect(result.current).toEqual({ x: 100, y: 200 });
    });
  });

  describe("useOpenAtCursorPosition", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useOpenAtCursorPosition());

      expect(result.current.isOpenAtMouse).toBe(false);
      expect(result.current.placement).toBe("right-start");
      expect(result.current.strategy).toBe("fixed");
    });

    it("should update isOpenAtMouse", () => {
      const { result } = renderHook(() => useOpenAtCursorPosition());

      act(() => {
        result.current.setOpenAtMousePosition(true);
      });

      expect(result.current.isOpenAtMouse).toBe(true);
    });
  });
});
