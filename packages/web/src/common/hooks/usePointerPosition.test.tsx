import { renderHook } from "@testing-library/react";
import type React from "react";
import {
  cursor$,
  PointerPositionContext,
  pointerState$,
} from "@web/common/context/pointer-position";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

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
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePointerPosition());
      }).toThrow(
        "usePointerPosition must be used within Provider and be defined.",
      );

      consoleSpy.mockRestore();
    });

    it("should return context value when used within provider", () => {
      const mockContext = { togglePointerMovementTracking: mock() };
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
