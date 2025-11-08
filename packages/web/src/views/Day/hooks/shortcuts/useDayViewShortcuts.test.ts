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

// Mock react-toastify
jest.mock("react-toastify", () => ({
  toast: {
    dismiss: jest.fn(),
  },
}));

// Mock shortcut utility functions
jest.mock("../../util/shortcut.util", () => ({
  isEditable: jest.fn(),
  isFocusedOnTaskCheckbox: jest.fn(),
  isFocusedWithinTask: jest.fn(),
  getFocusedTaskId: jest.fn(),
}));

describe("useDayViewShortcuts", () => {
  let mockIsEditable: jest.Mock;
  let mockIsFocusedOnTaskCheckbox: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock functions from the module
    const {
      isEditable,
      isFocusedOnTaskCheckbox,
    } = require("../../util/shortcut.util");
    mockIsEditable = isEditable as jest.Mock;
    mockIsFocusedOnTaskCheckbox = isFocusedOnTaskCheckbox as jest.Mock;

    // Set default mock implementations
    mockIsEditable.mockReturnValue(false);
    mockIsFocusedOnTaskCheckbox.mockReturnValue(false);
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

    mockIsEditable.mockReturnValue(true);

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

    mockIsEditable.mockReturnValue(true);

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

    mockIsEditable.mockReturnValue(true);

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

    mockIsFocusedOnTaskCheckbox.mockReturnValue(true);

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
    let mockIsFocusedWithinTask: jest.Mock;
    let mockGetFocusedTaskId: jest.Mock;

    beforeEach(() => {
      const {
        isFocusedWithinTask,
        getFocusedTaskId,
      } = require("../../util/shortcut.util");
      mockIsFocusedWithinTask = isFocusedWithinTask as jest.Mock;
      mockGetFocusedTaskId = getFocusedTaskId as jest.Mock;
    });

    it("should call onMigrateTask when Ctrl+Meta+ArrowRight is pressed within a task", () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      renderHook(() => useDayViewShortcuts(config));

      // Mock utility functions to return task-focused state
      mockIsFocusedWithinTask.mockReturnValue(true);
      mockGetFocusedTaskId.mockReturnValue("task-123");

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onMigrateTask).toHaveBeenCalledWith("task-123", "forward");
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should call onMigrateTask when Ctrl+Meta+ArrowLeft is pressed within a task", () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      renderHook(() => useDayViewShortcuts(config));

      // Mock utility functions to return task-focused state
      mockIsFocusedWithinTask.mockReturnValue(true);
      mockGetFocusedTaskId.mockReturnValue("task-456");

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "ArrowLeft",
        ctrlKey: true,
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onMigrateTask).toHaveBeenCalledWith("task-456", "backward");
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should not trigger migration when only Ctrl is pressed", () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
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

      expect(onMigrateTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should not trigger migration when only Meta is pressed", () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
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

      expect(onMigrateTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should trigger migration even when typing in input (special case)", () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      renderHook(() => useDayViewShortcuts(config));

      // Mock utility functions to return task-focused state
      mockIsFocusedWithinTask.mockReturnValue(true);
      mockGetFocusedTaskId.mockReturnValue("task-789");

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

      expect(onMigrateTask).toHaveBeenCalledWith("task-789", "forward");
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe("undo shortcuts", () => {
    let mockToastDismiss: jest.Mock;

    beforeEach(() => {
      // Get the mock function from the module
      const { toast } = require("react-toastify");
      mockToastDismiss = toast.dismiss as jest.Mock;
      mockToastDismiss.mockClear();
    });

    it("should call onRestoreTask when Meta+Z is pressed", () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "task-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        undoToastId,
        // No eventUndoToastId to test task undo
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "z",
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onRestoreTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should dismiss undo toast when Meta+Z is pressed with undoToastId", () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "undo-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        undoToastId,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "z",
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onRestoreTask).toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(undoToastId);
    });

    it("should work with uppercase Z", () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "task-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        undoToastId,
        // No eventUndoToastId to test task undo
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "Z",
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onRestoreTask).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should not trigger restore when only 'z' is pressed without Meta", () => {
      const onRestoreTask = jest.fn();
      const config = {
        ...defaultConfig,
        onRestoreTask,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "z",
        metaKey: false,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onRestoreTask).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should prioritize event undo over task undo when both exist", () => {
      const onRestoreTask = jest.fn();
      const onRestoreEvent = jest.fn();
      const undoToastId = "task-toast-123";
      const eventUndoToastId = "event-toast-456";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        onRestoreEvent,
        undoToastId,
        eventUndoToastId,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "z",
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      // Should call event restore, not task restore
      expect(onRestoreEvent).toHaveBeenCalled();
      expect(onRestoreTask).not.toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(eventUndoToastId);
      expect(mockToastDismiss).not.toHaveBeenCalledWith(undoToastId);
    });

    it("should call event restore with Ctrl+Z on Windows", () => {
      const onRestoreEvent = jest.fn();
      const eventUndoToastId = "event-toast-789";
      const config = {
        ...defaultConfig,
        onRestoreEvent,
        eventUndoToastId,
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      expect(onRestoreEvent).toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(eventUndoToastId);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should fall back to task undo if no event undo exists", () => {
      const onRestoreTask = jest.fn();
      const onRestoreEvent = jest.fn();
      const undoToastId = "task-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        onRestoreEvent,
        undoToastId,
        // No eventUndoToastId
      };
      renderHook(() => useDayViewShortcuts(config));

      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      const mockEvent = {
        key: "z",
        metaKey: true,
        preventDefault: jest.fn(),
        target: document.createElement("div"),
      };

      keydownHandler(mockEvent);

      // Should call task restore since no event undo exists
      expect(onRestoreTask).toHaveBeenCalled();
      expect(onRestoreEvent).not.toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(undoToastId);
    });
  });
});
