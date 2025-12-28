import React from "react";
import { renderHook } from "@testing-library/react";
import {
  PointerPositionContext,
  cursor$,
  pointerState$,
} from "@web/common/context/pointer-position";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";

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

describe("usePointerPosition hooks", () => {
  beforeEach(() => {
    // Reset subjects
    pointerState$.next({
      pointerdown: false,
      selectionStart: null,
      isOverGrid: false,
      isOverSidebar: false,
      isOverMainGrid: false,
      isOverSomedayWeek: false,
      isOverSomedayMonth: false,
      isOverAllDayRow: false,
    });
    cursor$.next({ x: 0, y: 0 });
  });

  describe("usePointerPosition", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for the expected error
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePointerPosition());
      }).toThrow(
        "usePointerPosition must be used within Provider and be defined.",
      );

      consoleSpy.mockRestore();
    });

    it("should return context value when used within provider", () => {
      const mockContext = { togglePointerMovementTracking: jest.fn() };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PointerPositionContext.Provider value={mockContext}>
          {children}
        </PointerPositionContext.Provider>
      );

      const { result } = renderHook(() => usePointerPosition(), { wrapper });
      expect(result.current).toBe(mockContext);
    });
  });
});
