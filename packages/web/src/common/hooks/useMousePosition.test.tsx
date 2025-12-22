import React from "react";
import { renderHook } from "@testing-library/react";
import {
  MousePositionContext,
  cursor$,
  mouseState$,
} from "@web/common/context/mouse-position";
import { useMousePosition } from "@web/common/hooks/useMousePosition";

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
        "useMousePosition must be used within Provider and be defined.",
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
});
