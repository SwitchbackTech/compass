import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useIsMobile } from "./useIsMobile";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock window.matchMedia
const mockMatchMedia = mock();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

describe("useIsMobile", () => {
  beforeEach(() => {
    mockMatchMedia.mockClear();
  });

  it("returns true for mobile viewport widths", () => {
    const mockMediaQuery = {
      matches: true,
      addEventListener: mock(),
      removeEventListener: mock(),
    };
    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 768px)");
  });

  it("returns false for desktop viewport widths", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: mock(),
      removeEventListener: mock(),
    };
    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 768px)");
  });

  it("responds to viewport changes", () => {
    let changeHandler: (() => void) | null = null;
    const mockMediaQuery = {
      matches: false,
      addEventListener: mock((event, handler) => {
        if (event === "change") {
          changeHandler = handler;
        }
      }),
      removeEventListener: mock(),
    };
    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate viewport change to mobile
    mockMediaQuery.matches = true;
    act(() => {
      if (changeHandler) {
        changeHandler();
      }
    });

    expect(result.current).toBe(true);

    // Simulate viewport change back to desktop
    mockMediaQuery.matches = false;
    act(() => {
      if (changeHandler) {
        changeHandler();
      }
    });

    expect(result.current).toBe(false);
  });

  it("cleans up event listener on unmount", () => {
    const mockRemoveEventListener = mock();
    const mockMediaQuery = {
      matches: false,
      addEventListener: mock(),
      removeEventListener: mockRemoveEventListener,
    };
    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
