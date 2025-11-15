import { renderHook } from "@testing-library/react";
import { Task } from "@web/views/Day/task.types";
import { useNowViewShortcuts } from "./useNowViewShortcuts";

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

// Mock shortcut utility functions
jest.mock("@web/views/Day/util/shortcut.util", () => ({
  isEditable: jest.fn(),
}));

describe("useNowViewShortcuts", () => {
  let mockIsEditable: jest.Mock;

  const mockTask1: Task = {
    id: "task-1",
    title: "Task 1",
    status: "incomplete",
    date: new Date("2024-01-01"),
  };

  const mockTask2: Task = {
    id: "task-2",
    title: "Task 2",
    status: "incomplete",
    date: new Date("2024-01-01"),
  };

  const defaultProps = {
    focusedTask: mockTask1,
    availableTasks: [mockTask1, mockTask2],
    onPreviousTask: jest.fn(),
    onNextTask: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock function from the module
    const { isEditable } = require("@web/views/Day/util/shortcut.util");
    mockIsEditable = isEditable as jest.Mock;

    // Set default mock implementation
    mockIsEditable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add and remove event listeners on mount and unmount", () => {
    const { unmount } = renderHook(() => useNowViewShortcuts(defaultProps));

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

  it("should call onPreviousTask when 'j' is pressed", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "j",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onPreviousTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should call onNextTask when 'k' is pressed", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "k",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onNextTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in input elements", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    mockIsEditable.mockReturnValue(true);

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const input = document.createElement("input");
    const mockEvent = {
      key: "j",
      preventDefault: jest.fn(),
      target: input,
    };

    keydownHandler(mockEvent);

    expect(props.onPreviousTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in textarea elements", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    mockIsEditable.mockReturnValue(true);

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const textarea = document.createElement("textarea");
    const mockEvent = {
      key: "k",
      preventDefault: jest.fn(),
      target: textarea,
    };

    keydownHandler(mockEvent);

    expect(props.onNextTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in contenteditable elements", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    mockIsEditable.mockReturnValue(true);

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const mockEvent = {
      key: "j",
      preventDefault: jest.fn(),
      target: div,
    };

    keydownHandler(mockEvent);

    expect(props.onPreviousTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when there is no focused task", () => {
    const props = {
      ...defaultProps,
      focusedTask: null,
    };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "j",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onPreviousTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when there are no available tasks", () => {
    const props = {
      ...defaultProps,
      availableTasks: [],
    };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "k",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onNextTask).not.toHaveBeenCalled();
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should handle shortcuts when focusedTask exists and availableTasks has items", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "j",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onPreviousTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should handle case-insensitive key matching for 'j'", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "J",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onPreviousTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should handle case-insensitive key matching for 'k'", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "K",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent);

    expect(props.onNextTask).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should not handle global shortcuts (handled in useNowShortcuts hook)", () => {
    const props = { ...defaultProps };
    renderHook(() => useNowViewShortcuts(props));

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent1 = {
      key: "1",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };
    const mockEvent2 = {
      key: "2",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };
    const mockEvent3 = {
      key: "3",
      preventDefault: jest.fn(),
      target: document.createElement("div"),
    };

    keydownHandler(mockEvent1);
    keydownHandler(mockEvent2);
    keydownHandler(mockEvent3);

    // Global shortcuts have empty handlers, so preventDefault should not be called
    expect(mockEvent1.preventDefault).not.toHaveBeenCalled();
    expect(mockEvent2.preventDefault).not.toHaveBeenCalled();
    expect(mockEvent3.preventDefault).not.toHaveBeenCalled();
  });
});
