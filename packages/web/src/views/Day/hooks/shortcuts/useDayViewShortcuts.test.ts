import { renderHook } from "@testing-library/react";
import { useDayViewShortcuts } from "./useDayViewShortcuts";

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

describe("useDayViewShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultConfig = {
    onAddTask: jest.fn(),
    onEditTask: jest.fn(),
    onCompleteTask: jest.fn(),
    onDeleteTask: jest.fn(),
    onEscape: jest.fn(),
    onFocusTasks: jest.fn(),
    isEditingTask: false,
    hasFocusedTask: false,
  };

  it("should add and remove event listeners on mount and unmount", () => {
    const { unmount } = renderHook(() => useDayViewShortcuts(defaultConfig));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should call onFocusTasks when 'u' is pressed", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "u",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onFocusTasks).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onAddTask when 'c' is pressed", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "c",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onAddTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onEditTask when 'e' is pressed", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "e",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onEditTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onEscape when 'Escape' is pressed", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Escape",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onEscape).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onCompleteTask when Enter is pressed on a focused task", () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    // Mock document.activeElement to not be a task button
    Object.defineProperty(document, "activeElement", {
      value: document.createElement("div"),
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(config.onCompleteTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed on a task button", () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "test-task");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(config.onCompleteTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed while editing", () => {
    const config = {
      ...defaultConfig,
      hasFocusedTask: true,
      isEditingTask: true,
    };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onCompleteTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed without focused task", () => {
    const config = { ...defaultConfig, hasFocusedTask: false };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onCompleteTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in input elements", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const input = document.createElement("input");
    const mockEvent = {
      key: "u",
      preventDefault: jest.fn(),
      target: input,
    };

    keydownHandler(mockEvent);

    expect(config.onFocusTasks).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in textarea elements", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const textarea = document.createElement("textarea");
    const mockEvent = {
      key: "c",
      preventDefault: jest.fn(),
      target: textarea,
    };

    keydownHandler(mockEvent);

    expect(config.onAddTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in contenteditable elements", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const mockEvent = {
      key: "e",
      preventDefault: jest.fn(),
      target: div,
    };

    keydownHandler(mockEvent);

    expect(config.onEditTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should still handle Escape when typing in input elements", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const input = document.createElement("input");
    const mockEvent = {
      key: "Escape",
      preventDefault: jest.fn(),
      target: input,
    };

    keydownHandler(mockEvent);

    expect(config.onEscape).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should handle case insensitive key presses", () => {
    const config = { ...defaultConfig };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "U", // uppercase
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onFocusTasks).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onDeleteTask when Delete is pressed on a focused checkbox", () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Delete",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "test-task");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(config.onDeleteTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when Delete is pressed on an input field", () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const input = document.createElement("input");
    const mockEvent = {
      key: "Delete",
      preventDefault: jest.fn(),
      target: input,
    };

    // Mock document.activeElement to be an input
    Object.defineProperty(document, "activeElement", {
      value: input,
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(config.onDeleteTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when no task is focused", () => {
    const config = { ...defaultConfig, hasFocusedTask: false };
    renderHook(() => useDayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Delete",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onDeleteTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  describe("migration shortcuts", () => {
    it("should call onMigrateForward when Ctrl+Meta+ArrowRight is pressed", () => {
      const onMigrateForward = jest.fn();
      const onMigrateBackward = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateForward,
        onMigrateBackward,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onMigrateForward).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should call onMigrateBackward when Ctrl+Meta+ArrowLeft is pressed", () => {
      const onMigrateForward = jest.fn();
      const onMigrateBackward = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateForward,
        onMigrateBackward,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "ArrowLeft",
        ctrlKey: true,
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onMigrateBackward).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should not trigger migration when only Ctrl is pressed", () => {
      const onMigrateForward = jest.fn();
      const onMigrateBackward = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateForward,
        onMigrateBackward,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onMigrateForward).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should not trigger migration when only Meta is pressed", () => {
      const onMigrateForward = jest.fn();
      const onMigrateBackward = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateForward,
        onMigrateBackward,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "ArrowLeft",
        ctrlKey: false,
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onMigrateBackward).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should trigger migration even when typing in input (special case)", () => {
      const onMigrateForward = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateForward,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const input = document.createElement("input");
      const mockEvent = {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: true,
        preventDefault: jest.fn(),
        target: input,
      };

      keydownHandler(mockEvent);

      expect(onMigrateForward).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });
});
