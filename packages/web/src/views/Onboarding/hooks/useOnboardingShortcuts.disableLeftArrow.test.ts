import { renderHook } from "@testing-library/react";
import { useOnboardingShortcuts } from "./useOnboardingShortcuts";

// Mock document methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockPreventDefault = jest.fn();
const mockStopPropagation = jest.fn();

// Mock document.activeElement
const mockActiveElement = {
  tagName: "DIV",
};

Object.defineProperty(document, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

Object.defineProperty(document, "activeElement", {
  value: mockActiveElement,
  writable: true,
});

describe("useOnboardingShortcuts - disableLeftArrow functionality", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
    mockPreventDefault.mockClear();
    mockStopPropagation.mockClear();
  });

  afterEach(() => {
    // Clean up any event listeners
    const cleanup = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[2];
    if (cleanup) {
      cleanup();
    }
  });

  const defaultProps = {
    onNext: mockOnNext,
    onPrevious: mockOnPrevious,
    canNavigateNext: true,
    handlesKeyboardEvents: false,
  };

  describe("disableLeftArrow = true", () => {
    it("should prevent left arrow navigation when disableLeftArrow is true", () => {
      const props = { ...defaultProps, disableLeftArrow: true };
      renderHook(() => useOnboardingShortcuts(props));

      // Verify that event listener was added
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        false,
      );

      // Get the event handler function
      const keydownHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === "keydown",
      )?.[1];

      expect(keydownHandler).toBeDefined();

      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(leftArrowEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should still allow right arrow navigation when disableLeftArrow is true", () => {
      const props = { ...defaultProps, disableLeftArrow: true };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const rightArrowEvent = {
        key: "ArrowRight",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(rightArrowEvent);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });

    it("should still allow Enter key navigation when disableLeftArrow is true", () => {
      const props = { ...defaultProps, disableLeftArrow: true };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const enterEvent = {
        key: "Enter",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(enterEvent);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });

  describe("disableLeftArrow = false", () => {
    it("should allow left arrow navigation when disableLeftArrow is false", () => {
      const props = { ...defaultProps, disableLeftArrow: false };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(leftArrowEvent);

      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });

    it("should allow right arrow navigation when disableLeftArrow is false", () => {
      const props = { ...defaultProps, disableLeftArrow: false };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const rightArrowEvent = {
        key: "ArrowRight",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(rightArrowEvent);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });

  describe("disableLeftArrow = undefined (default)", () => {
    it("should allow left arrow navigation when disableLeftArrow is undefined", () => {
      const props = { ...defaultProps };
      delete (props as any).disableLeftArrow;
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(leftArrowEvent);

      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });

  describe("disableLeftArrow with other navigation controls", () => {
    it("should prevent left arrow even when canNavigateNext is true", () => {
      const props = {
        ...defaultProps,
        disableLeftArrow: true,
        canNavigateNext: true,
      };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(leftArrowEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should prevent left arrow even when shouldPreventNavigation is false", () => {
      const props = {
        ...defaultProps,
        disableLeftArrow: true,
        shouldPreventNavigation: false,
      };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(leftArrowEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should not interfere with right arrow prevention when canNavigateNext is false", () => {
      const props = {
        ...defaultProps,
        disableLeftArrow: true,
        canNavigateNext: false,
      };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];

      // Test left arrow (should be prevented by disableLeftArrow)
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };
      keydownHandler(leftArrowEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();

      // Reset mocks
      mockPreventDefault.mockClear();
      mockStopPropagation.mockClear();

      // Test right arrow (should be prevented by canNavigateNext: false)
      const rightArrowEvent = {
        key: "ArrowRight",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };
      keydownHandler(rightArrowEvent);

      expect(mockOnNext).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });
  });

  describe("dependency updates", () => {
    it("should update behavior when disableLeftArrow changes from false to true", () => {
      const { rerender } = renderHook(
        ({ props }) => useOnboardingShortcuts(props),
        {
          initialProps: { props: { ...defaultProps, disableLeftArrow: false } },
        },
      );

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      // Initially should allow left arrow
      keydownHandler(leftArrowEvent);
      expect(mockOnPrevious).toHaveBeenCalledTimes(1);

      // Reset mocks
      mockOnPrevious.mockClear();
      mockPreventDefault.mockClear();
      mockStopPropagation.mockClear();

      // Update to disable left arrow
      rerender({ props: { ...defaultProps, disableLeftArrow: true } });

      // Get the new handler
      const newKeydownHandler =
        mockAddEventListener.mock.calls[
          mockAddEventListener.mock.calls.length - 1
        ][1];

      // Now should prevent left arrow
      newKeydownHandler(leftArrowEvent);
      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should update behavior when disableLeftArrow changes from true to false", () => {
      const { rerender } = renderHook(
        ({ props }) => useOnboardingShortcuts(props),
        {
          initialProps: { props: { ...defaultProps, disableLeftArrow: true } },
        },
      );

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const leftArrowEvent = {
        key: "ArrowLeft",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      // Initially should prevent left arrow
      keydownHandler(leftArrowEvent);
      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();

      // Reset mocks
      mockOnPrevious.mockClear();
      mockPreventDefault.mockClear();
      mockStopPropagation.mockClear();

      // Update to allow left arrow
      rerender({ props: { ...defaultProps, disableLeftArrow: false } });

      // Get the new handler
      const newKeydownHandler =
        mockAddEventListener.mock.calls[
          mockAddEventListener.mock.calls.length - 1
        ][1];

      // Now should allow left arrow
      newKeydownHandler(leftArrowEvent);
      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });
});
