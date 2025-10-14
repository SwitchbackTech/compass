import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

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

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add and remove event listeners", () => {
    const config = {
      onAddTask: jest.fn(),
    };

    const { unmount } = renderHook(() => useKeyboardShortcuts(config));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    expect(mockRemoveEventListener).not.toHaveBeenCalled();

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should call onAddTask when T is pressed", () => {
    const onAddTask = jest.fn();
    const config = {
      onAddTask,
      isAddingTask: false,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "t",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onAddTask).toHaveBeenCalled();
  });

  it("should not call onAddTask when T is pressed in input", () => {
    const onAddTask = jest.fn();
    const config = {
      onAddTask,
      isAddingTask: false,
      isInInput: true,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "t",
      preventDefault: jest.fn(),
      target: document.createElement("input"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it("should not call onAddTask when already adding task", () => {
    const onAddTask = jest.fn();
    const config = {
      onAddTask,
      isAddingTask: true,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "t",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it("should call onEditTask when E is pressed with focused task", () => {
    const onEditTask = jest.fn();
    const config = {
      onEditTask,
      hasFocusedTask: true,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "e",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onEditTask).toHaveBeenCalled();
  });

  it("should call onFocusTasks when U is pressed", () => {
    const onFocusTasks = jest.fn();
    const config = {
      onFocusTasks,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "u",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onFocusTasks).toHaveBeenCalled();
  });

  it("should call onFocusCalendar when C is pressed", () => {
    const onFocusCalendar = jest.fn();
    const config = {
      onFocusCalendar,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "c",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onFocusCalendar).toHaveBeenCalled();
  });

  it("should call onNextTask when J is pressed with focused task", () => {
    const onNextTask = jest.fn();
    const config = {
      onNextTask,
      hasFocusedTask: true,
      isEditingTask: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "j",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onNextTask).toHaveBeenCalled();
  });

  it("should call onPrevTask when K is pressed with focused task", () => {
    const onPrevTask = jest.fn();
    const config = {
      onPrevTask,
      hasFocusedTask: true,
      isEditingTask: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "k",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onPrevTask).toHaveBeenCalled();
  });

  it("should call onCompleteTask when Enter is pressed with focused task", () => {
    const onCompleteTask = jest.fn();
    const config = {
      onCompleteTask,
      hasFocusedTask: true,
      isEditingTask: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

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

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onCompleteTask).toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed on task button", () => {
    const onCompleteTask = jest.fn();
    const config = {
      onCompleteTask,
      hasFocusedTask: true,
      isEditingTask: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "task-1");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("should call onEditEvent when E is pressed with focused event", () => {
    const onEditEvent = jest.fn();
    const config = {
      onEditEvent,
      hasFocusedEvent: true,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "e",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onEditEvent).toHaveBeenCalled();
  });

  it("should call onDeleteEvent when Delete is pressed with focused event", () => {
    const onDeleteEvent = jest.fn();
    const config = {
      onDeleteEvent,
      hasFocusedEvent: true,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Delete",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onDeleteEvent).toHaveBeenCalled();
  });

  it("should call onMoveEventUp when Shift+ArrowUp is pressed with focused event", () => {
    const onMoveEventUp = jest.fn();
    const config = {
      onMoveEventUp,
      hasFocusedEvent: true,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "ArrowUp",
      shiftKey: true,
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onMoveEventUp).toHaveBeenCalled();
  });

  it("should call onMoveEventDown when Shift+ArrowDown is pressed with focused event", () => {
    const onMoveEventDown = jest.fn();
    const config = {
      onMoveEventDown,
      hasFocusedEvent: true,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "ArrowDown",
      shiftKey: true,
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onMoveEventDown).toHaveBeenCalled();
  });

  it("should call onEscape when Escape is pressed", () => {
    const onEscape = jest.fn();
    const config = {
      onEscape,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Escape",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onEscape).toHaveBeenCalled();
  });

  it("should call onShowShortcuts when ? is pressed", () => {
    const onShowShortcuts = jest.fn();
    const config = {
      onShowShortcuts,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "?",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onShowShortcuts).toHaveBeenCalled();
  });

  it("should call onShowShortcuts when Shift+/ is pressed", () => {
    const onShowShortcuts = jest.fn();
    const config = {
      onShowShortcuts,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "/",
      shiftKey: true,
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(onShowShortcuts).toHaveBeenCalled();
  });

  it("should allow ? and Escape in input fields", () => {
    const onShowShortcuts = jest.fn();
    const onEscape = jest.fn();
    const config = {
      onShowShortcuts,
      onEscape,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const input = document.createElement("input");

    // Test ? in input
    const questionEvent = {
      key: "?",
      preventDefault: jest.fn(),
      target: input,
    };

    keydownHandler(questionEvent);

    expect(questionEvent.preventDefault).toHaveBeenCalled();
    expect(onShowShortcuts).toHaveBeenCalled();

    // Test Escape in input
    const escapeEvent = {
      key: "Escape",
      preventDefault: jest.fn(),
      target: input,
    };

    keydownHandler(escapeEvent);

    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(onEscape).toHaveBeenCalled();
  });

  it("should handle case insensitive key matching", () => {
    const onAddTask = jest.fn();
    const config = {
      onAddTask,
      isAddingTask: false,
      isInInput: false,
    };

    renderHook(() => useKeyboardShortcuts(config));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];

    // Test uppercase T
    const uppercaseEvent = {
      key: "T",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(uppercaseEvent);

    expect(uppercaseEvent.preventDefault).toHaveBeenCalled();
    expect(onAddTask).toHaveBeenCalled();
  });
});
