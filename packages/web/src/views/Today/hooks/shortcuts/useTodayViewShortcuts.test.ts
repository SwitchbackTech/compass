import { renderHook } from "@testing-library/react";
import { useTodayViewShortcuts } from "./useTodayViewShortcuts";

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

describe("useTodayViewShortcuts", () => {
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
    onEscape: jest.fn(),
    onFocusTasks: jest.fn(),
    isEditingTask: false,
    hasFocusedTask: false,
  };

  it("should add and remove event listeners on mount and unmount", () => {
    const { unmount } = renderHook(() => useTodayViewShortcuts(defaultConfig));

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
    renderHook(() => useTodayViewShortcuts(config));

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

  it("should call onAddTask when 't' is pressed", () => {
    const config = { ...defaultConfig };
    renderHook(() => useTodayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "t",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(config.onAddTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onEditTask when 'e' is pressed", () => {
    const config = { ...defaultConfig };
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const textarea = document.createElement("textarea");
    const mockEvent = {
      key: "t",
      preventDefault: jest.fn(),
      target: textarea,
    };

    keydownHandler(mockEvent);

    expect(config.onAddTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in contenteditable elements", () => {
    const config = { ...defaultConfig };
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
    renderHook(() => useTodayViewShortcuts(config));

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
});
