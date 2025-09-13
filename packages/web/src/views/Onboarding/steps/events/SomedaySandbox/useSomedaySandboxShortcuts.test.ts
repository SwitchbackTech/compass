import { act, renderHook } from "@testing-library/react";
import { useSomedaySandboxKeyboard } from "./useSomedaySandboxShortcuts";

// Mock the document methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Mock document
Object.defineProperty(document, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

// Mock document.activeElement
Object.defineProperty(document, "activeElement", {
  value: null,
  writable: true,
});

describe("useSomedaySandboxKeyboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset activeElement mock
    Object.defineProperty(document, "activeElement", {
      value: null,
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up any event listeners
    jest.clearAllMocks();
  });

  const defaultProps = {
    isWeekTaskReady: true,
    isMonthTaskReady: true,
    isSubmitting: false,
    handleNext: jest.fn(),
    onPrevious: jest.fn(),
  };

  it("should add keydown event listener on mount", () => {
    renderHook(() => useSomedaySandboxKeyboard(defaultProps));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      false,
    );
  });

  it("should remove keydown event listener on unmount", () => {
    const { unmount } = renderHook(() =>
      useSomedaySandboxKeyboard(defaultProps),
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      false,
    );
  });

  it("should call handleNext when k is pressed and conditions are met", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    renderHook(() => useSomedaySandboxKeyboard(props));

    // Get the event handler that was registered
    const eventHandler = mockAddEventListener.mock.calls[0][1];

    // Simulate k key press
    const event = new KeyboardEvent("keydown", { key: "k" });
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it("should call handleNext when Enter is pressed and conditions are met", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    renderHook(() => useSomedaySandboxKeyboard(props));

    // Get the event handler that was registered
    const eventHandler = mockAddEventListener.mock.calls[0][1];

    // Simulate Enter key press
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it("should not call handleNext when k is pressed but isWeekTaskReady is false", () => {
    const mockHandleNext = jest.fn();
    const props = {
      ...defaultProps,
      isWeekTaskReady: false,
      handleNext: mockHandleNext,
    };

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "k" });
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it("should not call handleNext when k is pressed but isMonthTaskReady is false", () => {
    const mockHandleNext = jest.fn();
    const props = {
      ...defaultProps,
      isMonthTaskReady: false,
      handleNext: mockHandleNext,
    };

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "k" });
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it("should not call handleNext when k is pressed but isSubmitting is true", () => {
    const mockHandleNext = jest.fn();
    const props = {
      ...defaultProps,
      isSubmitting: true,
      handleNext: mockHandleNext,
    };

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "k" });
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it("should not call handleNext when focused on an input element", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    // Mock activeElement as an input
    const mockInput = document.createElement("input");
    Object.defineProperty(document, "activeElement", {
      value: mockInput,
      writable: true,
    });

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "k" });

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).not.toHaveBeenCalled();
  });

  it("should not call handleNext when focused on a textarea element", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    // Mock activeElement as a textarea
    const mockTextarea = document.createElement("textarea");
    Object.defineProperty(document, "activeElement", {
      value: mockTextarea,
      writable: true,
    });

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "Enter" });

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).not.toHaveBeenCalled();
  });

  it("should not call handleNext for other keys", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];

    // Test various other keys (excluding j and k which now have functionality)
    const otherKeys = [
      "Space",
      "Tab",
      "Escape",
      "a",
      "1",
      "ArrowRight",
      "ArrowLeft",
    ];
    otherKeys.forEach((key) => {
      const event = new KeyboardEvent("keydown", { key });
      act(() => {
        eventHandler(event);
      });
    });

    expect(mockHandleNext).not.toHaveBeenCalled();
  });

  it("should update event listener when dependencies change", () => {
    const { rerender } = renderHook(
      ({
        isWeekTaskReady,
        isMonthTaskReady,
        isSubmitting,
        handleNext,
        onPrevious,
      }) =>
        useSomedaySandboxKeyboard({
          isWeekTaskReady,
          isMonthTaskReady,
          isSubmitting,
          handleNext,
          onPrevious,
        }),
      {
        initialProps: defaultProps,
      },
    );

    // Should have added listener on initial render
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);

    // Rerender with different props
    rerender({
      ...defaultProps,
      isWeekTaskReady: false,
    });

    // Should have removed old listener and added new one
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });

  it("should handle case when activeElement is null", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    // Ensure activeElement is null
    Object.defineProperty(document, "activeElement", {
      value: null,
      writable: true,
    });

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "k" });

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).toHaveBeenCalled();
  });

  it("should handle case when activeElement is not an input or textarea", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    // Mock activeElement as a div
    const mockDiv = document.createElement("div");
    Object.defineProperty(document, "activeElement", {
      value: mockDiv,
      writable: true,
    });

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "k" });

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).toHaveBeenCalled();
  });

  // Tests for 'k' key functionality (uppercase)
  it("should call handleNext when K (uppercase) is pressed and conditions are met", () => {
    const mockHandleNext = jest.fn();
    const props = { ...defaultProps, handleNext: mockHandleNext };

    renderHook(() => useSomedaySandboxKeyboard(props));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = new KeyboardEvent("keydown", { key: "K" });
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();

    act(() => {
      eventHandler(event);
    });

    expect(mockHandleNext).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  // Tests for 'j' key functionality
  describe("j key navigation", () => {
    it("should call onPrevious when j is pressed", () => {
      const mockOnPrevious = jest.fn();
      const props = { ...defaultProps, onPrevious: mockOnPrevious };

      renderHook(() => useSomedaySandboxKeyboard(props));

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      const event = new KeyboardEvent("keydown", { key: "j" });
      event.preventDefault = jest.fn();
      event.stopPropagation = jest.fn();

      act(() => {
        eventHandler(event);
      });

      expect(mockOnPrevious).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("should call onPrevious when J (uppercase) is pressed", () => {
      const mockOnPrevious = jest.fn();
      const props = { ...defaultProps, onPrevious: mockOnPrevious };

      renderHook(() => useSomedaySandboxKeyboard(props));

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      const event = new KeyboardEvent("keydown", { key: "J" });
      event.preventDefault = jest.fn();
      event.stopPropagation = jest.fn();

      act(() => {
        eventHandler(event);
      });

      expect(mockOnPrevious).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("should call onPrevious when j is pressed regardless of task readiness", () => {
      const mockOnPrevious = jest.fn();
      const props = {
        ...defaultProps,
        isWeekTaskReady: false,
        isMonthTaskReady: false,
        isSubmitting: true,
        onPrevious: mockOnPrevious,
      };

      renderHook(() => useSomedaySandboxKeyboard(props));

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      const event = new KeyboardEvent("keydown", { key: "j" });
      event.preventDefault = jest.fn();
      event.stopPropagation = jest.fn();

      act(() => {
        eventHandler(event);
      });

      expect(mockOnPrevious).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("should not call onPrevious when j is pressed while focused on input", () => {
      const mockOnPrevious = jest.fn();
      const props = { ...defaultProps, onPrevious: mockOnPrevious };

      // Mock activeElement as an input
      const mockInput = document.createElement("input");
      Object.defineProperty(document, "activeElement", {
        value: mockInput,
        writable: true,
      });

      renderHook(() => useSomedaySandboxKeyboard(props));

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      const event = new KeyboardEvent("keydown", { key: "j" });

      act(() => {
        eventHandler(event);
      });

      expect(mockOnPrevious).not.toHaveBeenCalled();
    });

    it("should not call onPrevious when j is pressed while focused on contentEditable", () => {
      const mockOnPrevious = jest.fn();
      const props = { ...defaultProps, onPrevious: mockOnPrevious };

      // Mock activeElement as a contentEditable div
      const mockDiv = document.createElement("div");
      mockDiv.contentEditable = "true";
      Object.defineProperty(document, "activeElement", {
        value: mockDiv,
        writable: true,
      });

      renderHook(() => useSomedaySandboxKeyboard(props));

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      const event = new KeyboardEvent("keydown", { key: "j" });

      act(() => {
        eventHandler(event);
      });

      expect(mockOnPrevious).not.toHaveBeenCalled();
    });
  });
});
