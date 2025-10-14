import { act, renderHook } from "@testing-library/react";
import { useAutofocus } from "./useAutofocus";

// Mock HTMLElement methods
const mockFocus = jest.fn();
const mockSelect = jest.fn();
const mockScrollIntoView = jest.fn();

// Mock DOM elements
const createMockElement = (tagName: string) => ({
  focus: mockFocus,
  select: mockSelect,
  scrollIntoView: mockScrollIntoView,
  tagName: tagName.toUpperCase(),
  getAttribute: jest.fn(),
  querySelector: jest.fn(),
});

describe("useAutofocus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document.querySelector
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === ".test-element") {
        return createMockElement("div") as any;
      }
      return null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should focus element when shouldFocus is true", () => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
      }),
    );

    expect(mockFocus).toHaveBeenCalled();
  });

  it("should not focus when shouldFocus is false", () => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: false,
        inputRef: mockRef,
      }),
    );

    expect(mockFocus).not.toHaveBeenCalled();
  });

  it("should focus on mount when focusOnMount is true", () => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        focusOnMount: true,
        inputRef: mockRef,
      }),
    );

    expect(mockFocus).toHaveBeenCalled();
  });

  it("should select text when selectText is true", () => {
    const mockRef = { current: createMockElement("input") as any };
    mockRef.current.value = "test value";

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
        selectText: true,
      }),
    );

    expect(mockFocus).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalled();
  });

  it("should use preventScroll option when specified", () => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
        preventScroll: true,
      }),
    );

    expect(mockFocus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("should scroll into view when scrollIntoView is true", () => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
        scrollIntoView: true,
      }),
    );

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });

  it("should use custom scroll options", () => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
        scrollIntoView: true,
        scrollBehavior: "auto",
        scrollBlock: "start",
        scrollInline: "start",
      }),
    );

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
      inline: "start",
    });
  });

  it("should focus with delay", (done) => {
    const mockRef = { current: createMockElement("input") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
        delay: 100,
      }),
    );

    expect(mockFocus).not.toHaveBeenCalled();

    setTimeout(() => {
      expect(mockFocus).toHaveBeenCalled();
      done();
    }, 150);
  });

  it("should focus element by selector", () => {
    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        selector: ".test-element",
      }),
    );

    expect(document.querySelector).toHaveBeenCalledWith(".test-element");
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should handle focus errors gracefully", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mockRef = { current: createMockElement("input") as any };

    // Mock focus to throw error
    mockRef.current.focus = jest.fn().mockImplementation(() => {
      throw new Error("Focus failed");
    });
    mockRef.current.select = jest.fn().mockImplementation(() => {
      throw new Error("Select failed");
    });

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: mockRef,
        selectText: true,
      }),
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to focus element:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("should refocus when dependencies change", () => {
    const mockRef = { current: createMockElement("input") as any };
    let dependencies = ["dep1"];

    const { rerender } = renderHook(() =>
      useAutofocus({
        focusOnCondition: true,
        inputRef: mockRef,
        dependencies,
      }),
    );

    expect(mockFocus).toHaveBeenCalledTimes(1);

    // Change dependencies
    dependencies = ["dep2"];
    rerender();

    expect(mockFocus).toHaveBeenCalledTimes(2);
  });

  it("should work with textarea ref", () => {
    const mockRef = { current: createMockElement("textarea") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        textareaRef: mockRef,
      }),
    );

    expect(mockFocus).toHaveBeenCalled();
  });

  it("should work with element ref", () => {
    const mockRef = { current: createMockElement("div") as any };

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        elementRef: mockRef,
      }),
    );

    expect(mockFocus).toHaveBeenCalled();
  });

  it("should return focusElement function", () => {
    const mockRef = { current: createMockElement("input") as any };

    const { result } = renderHook(() =>
      useAutofocus({
        inputRef: mockRef,
      }),
    );

    expect(typeof result.current.focusElement).toBe("function");

    act(() => {
      result.current.focusElement();
    });

    expect(mockFocus).toHaveBeenCalled();
  });
});
