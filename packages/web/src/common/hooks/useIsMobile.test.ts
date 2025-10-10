import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
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
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 768px)");
  });

  it("returns false for desktop viewport widths", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
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
      addEventListener: jest.fn((event, handler) => {
        if (event === "change") {
          changeHandler = handler;
        }
      }),
      removeEventListener: jest.fn(),
    };
    mockMatchMedia.mockReturnValue(mockMediaQuery);

    const { result, rerender } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate viewport change to mobile
    mockMediaQuery.matches = true;
    if (changeHandler) {
      changeHandler();
    }
    rerender();

    expect(result.current).toBe(true);

    // Simulate viewport change back to desktop
    mockMediaQuery.matches = false;
    if (changeHandler) {
      changeHandler();
    }
    rerender();

    expect(result.current).toBe(false);
  });

  it("cleans up event listener on unmount", () => {
    const mockRemoveEventListener = jest.fn();
    const mockMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
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
