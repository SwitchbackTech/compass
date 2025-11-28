import { act } from "react";
import { fireEvent } from "@testing-library/react";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { keyPressed } from "@web/common/utils/dom-events/event-emitter.util";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";

// Mock shortcut utility functions
jest.mock("@web/views/Day/util/day.shortcut.util");

describe("useDayViewShortcuts", () => {
  const {
    isEditable,
    isFocusedOnTaskCheckbox,
    isFocusedWithinTask,
    getFocusedTaskId,
  } = jest.requireMock("@web/views/Day/util/day.shortcut.util");

  beforeEach(() => {
    jest.clearAllMocks();
    keyPressed.next(null);

    // Set default mock implementations
    isEditable.mockReturnValue(false);
    isFocusedOnTaskCheckbox.mockReturnValue(false);
    isFocusedWithinTask.mockReturnValue(false);
    getFocusedTaskId.mockReturnValue(null);
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

  it("should call onFocusTasks when 'u' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "u" });
    fireEvent.keyUp(window, { key: "u" });

    expect(config.onFocusTasks).toHaveBeenCalled();
  });

  it("should call onAddTask when 'c' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "c" });
    fireEvent.keyUp(window, { key: "c" });

    expect(config.onAddTask).toHaveBeenCalled();
  });

  it("should call onEditTask when 'e' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyUp(window, { key: "e" });

    expect(config.onEditTask).toHaveBeenCalled();
  });

  it("should call onEscape when 'Escape' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "Escape" });
    // Escape is useKeyDownEvent, so keydown is enough

    expect(config.onEscape).toHaveBeenCalled();
  });

  it("should call onCompleteTask when Enter is pressed on a focused task", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    // Mock document.activeElement to not be a task button
    Object.defineProperty(document, "activeElement", {
      value: document.createElement("div"),
      writable: true,
    });

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyUp(window, { key: "Enter" });

    expect(config.onCompleteTask).toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed on a task button", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "test-task");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyUp(window, { key: "Enter" });

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed while editing", async () => {
    const config = {
      ...defaultConfig,
      hasFocusedTask: true,
      isEditingTask: true,
    };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyUp(window, { key: "Enter" });

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed without focused task", async () => {
    const config = { ...defaultConfig, hasFocusedTask: false };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyUp(window, { key: "Enter" });

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in input elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isEditable.mockReturnValue(true);

    const input = document.createElement("input");
    fireEvent.keyDown(input, { key: "u" });
    fireEvent.keyUp(input, { key: "u" });

    expect(config.onFocusTasks).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in textarea elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isEditable.mockReturnValue(true);

    const textarea = document.createElement("textarea");
    fireEvent.keyDown(textarea, { key: "c" });
    fireEvent.keyUp(textarea, { key: "c" });

    expect(config.onAddTask).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in contenteditable elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isEditable.mockReturnValue(true);

    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    fireEvent.keyDown(div, { key: "e" });
    fireEvent.keyUp(div, { key: "e" });

    expect(config.onEditTask).not.toHaveBeenCalled();
  });

  it("should still handle Escape when typing in input elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "Escape" });
    document.body.removeChild(input);

    expect(config.onEscape).toHaveBeenCalled();
  });

  it("should handle case insensitive key presses", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "U" });
    fireEvent.keyUp(window, { key: "U" });

    expect(config.onFocusTasks).toHaveBeenCalled();
  });

  it("should call onDeleteTask when Delete is pressed on a focused checkbox", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isFocusedOnTaskCheckbox.mockReturnValue(true);

    // Mock document.activeElement to be a task button
    const taskButton = document.createElement("button");
    taskButton.setAttribute("role", "checkbox");
    taskButton.setAttribute("data-task-id", "test-task");
    Object.defineProperty(document, "activeElement", {
      value: taskButton,
      writable: true,
    });

    fireEvent.keyDown(window, { key: "Delete" });
    fireEvent.keyUp(window, { key: "Delete" });

    expect(config.onDeleteTask).toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when Delete is pressed on an input field", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    const input = document.createElement("input");
    // Mock document.activeElement to be an input
    Object.defineProperty(document, "activeElement", {
      value: input,
      writable: true,
    });

    fireEvent.keyDown(input, { key: "Delete" });
    fireEvent.keyUp(input, { key: "Delete" });

    expect(config.onDeleteTask).not.toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when no task is focused", async () => {
    const config = { ...defaultConfig, hasFocusedTask: false };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    fireEvent.keyDown(window, { key: "Delete" });
    fireEvent.keyUp(window, { key: "Delete" });

    expect(config.onDeleteTask).not.toHaveBeenCalled();
  });

  describe("migration shortcuts", () => {
    beforeEach(() => {
      // Reset mocks specifically for this block if needed
    });

    it("should call onMigrateTask when Ctrl+Meta+ArrowRight is pressed within a task", async () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-123");

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, {
        key: "ArrowRight",
        ...modifierProps,
      });

      expect(onMigrateTask).toHaveBeenCalledWith("task-123", "forward");
    });

    it("should call onMigrateTask when Ctrl+Meta+ArrowLeft is pressed within a task", async () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-456");

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, {
        key: "ArrowLeft",
        ...modifierProps,
      });

      expect(onMigrateTask).toHaveBeenCalledWith("task-456", "backward");
    });

    it("should not trigger migration when only Ctrl is pressed", async () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      fireEvent.keyDown(window, {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: false,
      });

      expect(onMigrateTask).not.toHaveBeenCalled();
    });

    it("should not trigger migration when only Meta is pressed", async () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      fireEvent.keyDown(window, {
        key: "ArrowLeft",
        ctrlKey: false,
        metaKey: true,
      });

      expect(onMigrateTask).not.toHaveBeenCalled();
    });

    it("should trigger migration even when typing in input (special case)", async () => {
      const onMigrateTask = jest.fn();
      const config = {
        ...defaultConfig,
        onMigrateTask,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-789");

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      const input = document.createElement("input");
      document.body.appendChild(input);

      fireEvent.keyDown(input, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(input, {
        key: "ArrowRight",
        ...modifierProps,
      });

      document.body.removeChild(input);

      expect(onMigrateTask).toHaveBeenCalledWith("task-789", "forward");
    });
  });

  describe("undo shortcuts", () => {
    let mockToastDismiss: jest.Mock;

    beforeEach(() => {
      // Get the mock function from the module
      const { toast } = jest.requireMock("react-toastify");
      mockToastDismiss = toast.dismiss as jest.Mock;
      mockToastDismiss.mockClear();
    });

    it("should call onRestoreTask when Meta+Z is pressed", async () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "task-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        undoToastId,
        // No eventUndoToastId to test task undo
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "z", ...modifierProps });
      fireEvent.keyUp(window, { key: "z", ...modifierProps });

      expect(onRestoreTask).toHaveBeenCalled();
    });

    it("should dismiss undo toast when Meta+Z is pressed with undoToastId", async () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "undo-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        undoToastId,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "z", ...modifierProps });
      fireEvent.keyUp(window, { key: "z", ...modifierProps });

      expect(onRestoreTask).toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(undoToastId);
    });

    it("should work with uppercase Z", async () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "task-toast-123";
      const config = {
        ...defaultConfig,
        onRestoreTask,
        undoToastId,
        // No eventUndoToastId to test task undo
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "Z", ...modifierProps });
      fireEvent.keyUp(window, { key: "Z", ...modifierProps });

      expect(onRestoreTask).toHaveBeenCalled();
    });

    it("should not trigger restore when only 'z' is pressed without Meta", async () => {
      const onRestoreTask = jest.fn();
      const config = {
        ...defaultConfig,
        onRestoreTask,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      fireEvent.keyDown(window, { key: "z", metaKey: false });
      fireEvent.keyUp(window, { key: "z", metaKey: false });

      expect(onRestoreTask).not.toHaveBeenCalled();
    });

    it("should prioritize event undo over task undo when both exist", async () => {
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
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "z", ...modifierProps });
      fireEvent.keyUp(window, { key: "z", ...modifierProps });

      // Should call event restore, not task restore
      expect(onRestoreEvent).toHaveBeenCalled();
      expect(onRestoreTask).not.toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(eventUndoToastId);
      expect(mockToastDismiss).not.toHaveBeenCalledWith(undoToastId);
    });

    it("should call event restore with Ctrl+Z on Windows", async () => {
      const onRestoreEvent = jest.fn();
      const eventUndoToastId = "event-toast-789";
      const config = {
        ...defaultConfig,
        onRestoreEvent,
        eventUndoToastId,
      };
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "z", ...modifierProps });
      fireEvent.keyUp(window, { key: "z", ...modifierProps });

      expect(onRestoreEvent).toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(eventUndoToastId);
    });

    it("should fall back to task undo if no event undo exists", async () => {
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
      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifierKey = getModifierKey();
      const isMetaKey = modifierKey === "Meta";
      const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "z", ...modifierProps });
      fireEvent.keyUp(window, { key: "z", ...modifierProps });

      // Should call task restore since no event undo exists
      expect(onRestoreTask).toHaveBeenCalled();
      expect(onRestoreEvent).not.toHaveBeenCalled();
      expect(mockToastDismiss).toHaveBeenCalledWith(undoToastId);
    });
  });
});
