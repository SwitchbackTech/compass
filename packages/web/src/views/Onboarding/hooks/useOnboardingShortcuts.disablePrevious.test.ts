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

describe("useOnboardingShortcuts - disablePrevious functionality", () => {
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

  describe("disablePrevious = true", () => {
    it("should prevent 'j' key navigation when disablePrevious is true", () => {
      const props = { ...defaultProps, disablePrevious: true };
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

      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(jKeyEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should prevent 'J' key navigation when disablePrevious is true", () => {
      const props = { ...defaultProps, disablePrevious: true };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const JKeyEvent = {
        key: "J",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(JKeyEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should still allow 'k' key navigation when disablePrevious is true", () => {
      const props = { ...defaultProps, disablePrevious: true };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const kKeyEvent = {
        key: "k",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(kKeyEvent);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });

    it("should still allow Enter key navigation when disablePrevious is true", () => {
      const props = { ...defaultProps, disablePrevious: true };
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

  describe("disablePrevious = false", () => {
    it("should allow 'j' key navigation when disablePrevious is false", () => {
      const props = { ...defaultProps, disablePrevious: false };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(jKeyEvent);

      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });

    it("should allow 'k' key navigation when disablePrevious is false", () => {
      const props = { ...defaultProps, disablePrevious: false };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const kKeyEvent = {
        key: "k",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(kKeyEvent);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });

  describe("disablePrevious = undefined (default)", () => {
    it("should allow 'j' key navigation when disablePrevious is undefined", () => {
      const props = { ...defaultProps };
      delete (props as any).disablePrevious;
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(jKeyEvent);

      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });

  describe("disablePrevious with other navigation controls", () => {
    it("should prevent 'j' key even when canNavigateNext is true", () => {
      const props = {
        ...defaultProps,
        disablePrevious: true,
        canNavigateNext: true,
      };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(jKeyEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should prevent 'j' key even when shouldPreventNavigation is false", () => {
      const props = {
        ...defaultProps,
        disablePrevious: true,
        shouldPreventNavigation: false,
      };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      keydownHandler(jKeyEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should not interfere with 'k' key prevention when canNavigateNext is false", () => {
      const props = {
        ...defaultProps,
        disablePrevious: true,
        canNavigateNext: false,
      };
      renderHook(() => useOnboardingShortcuts(props));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];

      // Test 'j' key (should be prevented by disablePrevious)
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };
      keydownHandler(jKeyEvent);

      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();

      // Reset mocks
      mockPreventDefault.mockClear();
      mockStopPropagation.mockClear();

      // Test 'k' key (should be prevented by canNavigateNext: false)
      const kKeyEvent = {
        key: "k",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };
      keydownHandler(kKeyEvent);

      expect(mockOnNext).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });
  });

  describe("dependency updates", () => {
    it("should update behavior when disablePrevious changes from false to true", () => {
      const { rerender } = renderHook(
        ({ props }) => useOnboardingShortcuts(props),
        {
          initialProps: { props: { ...defaultProps, disablePrevious: false } },
        },
      );

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      // Initially should allow 'j' key
      keydownHandler(jKeyEvent);
      expect(mockOnPrevious).toHaveBeenCalledTimes(1);

      // Reset mocks
      mockOnPrevious.mockClear();
      mockPreventDefault.mockClear();
      mockStopPropagation.mockClear();

      // Update to disable previous
      rerender({ props: { ...defaultProps, disablePrevious: true } });

      // Get the new handler
      const newKeydownHandler =
        mockAddEventListener.mock.calls[
          mockAddEventListener.mock.calls.length - 1
        ][1];

      // Now should prevent 'j' key
      newKeydownHandler(jKeyEvent);
      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("should update behavior when disablePrevious changes from true to false", () => {
      const { rerender } = renderHook(
        ({ props }) => useOnboardingShortcuts(props),
        {
          initialProps: { props: { ...defaultProps, disablePrevious: true } },
        },
      );

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const jKeyEvent = {
        key: "j",
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      };

      // Initially should prevent 'j' key
      keydownHandler(jKeyEvent);
      expect(mockOnPrevious).not.toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockStopPropagation).toHaveBeenCalled();

      // Reset mocks
      mockOnPrevious.mockClear();
      mockPreventDefault.mockClear();
      mockStopPropagation.mockClear();

      // Update to allow previous
      rerender({ props: { ...defaultProps, disablePrevious: false } });

      // Get the new handler
      const newKeydownHandler =
        mockAddEventListener.mock.calls[
          mockAddEventListener.mock.calls.length - 1
        ][1];

      // Now should allow 'j' key
      newKeydownHandler(jKeyEvent);
      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).not.toHaveBeenCalled();
      expect(mockStopPropagation).not.toHaveBeenCalled();
    });
  });
});
