import { act, renderHook } from "@testing-library/react";
import { useSidebarState } from "./useSidebarState";

// Helper to create a mock matchMedia
const createMatchMedia = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches,
    media: "",
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(
      (_event: string, listener: (e: MediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
    ),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach((listener) =>
        listener({ matches: newMatches } as MediaQueryListEvent),
      );
    },
  };
};

describe("useSidebarState", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("should return isOpen true when screen is wide (>=1280px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
    const mockMediaQuery = createMatchMedia(true);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useSidebarState());

    expect(result.current.isSidebarOpen).toBe(true);
  });

  it("should return isOpen false when screen is narrow (<1280px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1000,
    });
    const mockMediaQuery = createMatchMedia(false);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useSidebarState());

    expect(result.current.isSidebarOpen).toBe(false);
  });

  it("should toggle sidebar state when toggleSidebar is called", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
    const mockMediaQuery = createMatchMedia(true);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useSidebarState());

    expect(result.current.isSidebarOpen).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.isSidebarOpen).toBe(false);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.isSidebarOpen).toBe(true);
  });

  it("should close sidebar when screen resizes from wide to narrow", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
    const mockMediaQuery = createMatchMedia(true);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useSidebarState());

    expect(result.current.isSidebarOpen).toBe(true);

    act(() => {
      mockMediaQuery._triggerChange(false);
    });

    expect(result.current.isSidebarOpen).toBe(false);
  });

  it("should open sidebar when screen resizes from narrow to wide", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1000,
    });
    const mockMediaQuery = createMatchMedia(false);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useSidebarState());

    expect(result.current.isSidebarOpen).toBe(false);

    act(() => {
      mockMediaQuery._triggerChange(true);
    });

    expect(result.current.isSidebarOpen).toBe(true);
  });
});
