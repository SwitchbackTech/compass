import { act } from "react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import {
  keyPressed$,
  pressKey,
} from "@web/common/utils/dom/event-emitter.util";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";

// Mock shortcut utility functions
jest.mock("@web/views/Day/util/day.shortcut.util");

describe.each([
  { os: "Windows", mockFn: mockWindowsUserAgent },
  { os: "Linux", mockFn: mockLinuxUserAgent },
  { os: "MacOS", mockFn: mockMacOSUserAgent },
])("useDayViewShortcuts - $os", ({ mockFn }) => {
  beforeAll(mockFn);
  afterAll(() => jest.resetAllMocks());

  const {
    isEditable,
    isFocusedOnTaskCheckbox,
    isFocusedWithinTask,
    getFocusedTaskId,
  } = jest.requireMock("@web/views/Day/util/day.shortcut.util");

  beforeEach(() => {
    jest.clearAllMocks();
    keyPressed$.next(null);

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

    pressKey("u");

    expect(config.onFocusTasks).toHaveBeenCalled();
  });

  it("should call onAddTask when 'c' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("c");

    expect(config.onAddTask).toHaveBeenCalled();
  });

  it("should call onEditTask when 'e' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("e");

    expect(config.onEditTask).toHaveBeenCalled();
  });

  it("should call onEscape when 'Escape' is pressed", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("Escape");

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

    pressKey("Enter");

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

    pressKey("Enter");

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed while editing", async () => {
    const config = {
      ...defaultConfig,
      hasFocusedTask: true,
      isEditingTask: true,
    };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("Enter");

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not call onCompleteTask when Enter is pressed without focused task", async () => {
    const config = { ...defaultConfig, hasFocusedTask: false };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("Enter");

    expect(config.onCompleteTask).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in input elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isEditable.mockReturnValue(true);

    const input = document.createElement("input");

    document.body.appendChild(input);

    input.focus();

    pressKey("u", {}, input);

    expect(config.onFocusTasks).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in textarea elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isEditable.mockReturnValue(true);

    const textarea = document.createElement("textarea");

    document.body.appendChild(textarea);

    textarea.focus();

    pressKey("c", {}, textarea);

    expect(config.onAddTask).not.toHaveBeenCalled();
  });

  it("should not handle shortcuts when typing in contenteditable elements", async () => {
    const config = { ...defaultConfig };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    isEditable.mockReturnValue(true);

    const div = document.createElement("div");

    div.setAttribute("contenteditable", "true");

    document.body.appendChild(div);

    div.focus();

    pressKey("e", {}, div);

    expect(config.onEditTask).not.toHaveBeenCalled();
  });

  it("should still handle Escape when typing in input elements", async () => {
    const config = { ...defaultConfig };

    await act(() => renderHook(() => useDayViewShortcuts(config)));

    const input = document.createElement("input");

    document.body.appendChild(input);

    input.focus();

    pressKey("Escape");

    expect(config.onEscape).toHaveBeenCalled();
  });

  it("should handle case insensitive key presses", async () => {
    const config = { ...defaultConfig };

    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("U");

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

    pressKey("Delete");

    expect(config.onDeleteTask).toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when Delete is pressed on an input field", async () => {
    const config = { ...defaultConfig, hasFocusedTask: true };
    await act(() => renderHook(() => useDayViewShortcuts(config)));

    const input = document.createElement("input");

    document.body.appendChild(input);

    input.focus();

    pressKey("Delete", {}, input);

    expect(config.onDeleteTask).not.toHaveBeenCalled();
  });

  it("should NOT call onDeleteTask when no task is focused", async () => {
    const config = { ...defaultConfig, hasFocusedTask: false };

    await act(() => renderHook(() => useDayViewShortcuts(config)));

    pressKey("Delete");

    expect(config.onDeleteTask).not.toHaveBeenCalled();
  });

  describe("migration shortcuts", () => {
    it("should call onMigrateTask when Ctrl+Meta+ArrowRight is pressed within a task", async () => {
      const onMigrateTask = jest.fn();
      const config = { ...defaultConfig, onMigrateTask };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-123");

      fireEvent.keyDown(window, { key: "Control", ctrlKey: true });
      fireEvent.keyDown(window, { key: "Meta", ctrlKey: true, metaKey: true });
      fireEvent.keyDown(window, {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: true,
      });

      expect(onMigrateTask).toHaveBeenCalledWith("task-123", "forward");
    });

    it("should call onMigrateTask when Ctrl+Meta+ArrowLeft is pressed within a task", async () => {
      const onMigrateTask = jest.fn();
      const config = { ...defaultConfig, onMigrateTask };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-456");

      fireEvent.keyDown(window, { key: "Control", ctrlKey: true });
      fireEvent.keyDown(window, { key: "Meta", ctrlKey: true, metaKey: true });
      fireEvent.keyDown(window, {
        key: "ArrowLeft",
        ctrlKey: true,
        metaKey: true,
      });

      expect(onMigrateTask).toHaveBeenCalledWith("task-456", "backward");
    });

    it("should not trigger migration when only Ctrl is pressed", async () => {
      const onMigrateTask = jest.fn();
      const config = { ...defaultConfig, onMigrateTask };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      await userEvent.keyboard("{Control>}{ArrowRight}");

      expect(onMigrateTask).not.toHaveBeenCalled();
    });

    it("should not trigger migration when only Meta is pressed", async () => {
      const onMigrateTask = jest.fn();
      const config = { ...defaultConfig, onMigrateTask };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      await userEvent.keyboard("{Meta>}{ArrowRight}");

      expect(onMigrateTask).not.toHaveBeenCalled();
    });

    it("should trigger migration even when typing in input (special case)", async () => {
      const onMigrateTask = jest.fn();
      const config = { ...defaultConfig, onMigrateTask };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      // Mock utility functions to return task-focused state
      isFocusedWithinTask.mockReturnValue(true);
      getFocusedTaskId.mockReturnValue("task-789");

      const input = document.createElement("input");

      document.body.appendChild(input);

      input.focus();

      fireEvent.keyDown(window, { key: "Control", ctrlKey: true });
      fireEvent.keyDown(window, { key: "Meta", ctrlKey: true, metaKey: true });
      fireEvent.keyDown(window, {
        key: "ArrowRight",
        ctrlKey: true,
        metaKey: true,
      });

      document.body.removeChild(input);

      expect(onMigrateTask).toHaveBeenCalledWith("task-789", "forward");
    });
  });

  describe("undo shortcuts", () => {
    const { toast } = jest.requireMock("react-toastify");

    beforeEach(() => toast.dismiss.mockClear());

    it("should call onRestoreTask when Meta+Z is pressed", async () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "task-toast-123";
      const config = { ...defaultConfig, onRestoreTask, undoToastId };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifier = getModifierKey();
      const isCtrl = modifier === "Control";
      const isMeta = modifier === "Meta";
      fireEvent.keyDown(window, {
        key: modifier,
        ctrlKey: isCtrl,
        metaKey: isMeta,
      });
      fireEvent.keyDown(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });
      fireEvent.keyUp(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });

      expect(onRestoreTask).toHaveBeenCalled();
    });

    it("should dismiss undo toast when Meta+Z is pressed with undoToastId", async () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "undo-toast-123";
      const config = { ...defaultConfig, onRestoreTask, undoToastId };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifier = getModifierKey();
      const isCtrl = modifier === "Control";
      const isMeta = modifier === "Meta";
      fireEvent.keyDown(window, {
        key: modifier,
        ctrlKey: isCtrl,
        metaKey: isMeta,
      });
      fireEvent.keyDown(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });
      fireEvent.keyUp(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });

      expect(onRestoreTask).toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(undoToastId);
    });

    it("should work with uppercase Z", async () => {
      const onRestoreTask = jest.fn();
      const undoToastId = "task-toast-123";
      const config = { ...defaultConfig, onRestoreTask, undoToastId };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifier = getModifierKey();
      const isCtrl = modifier === "Control";
      const isMeta = modifier === "Meta";
      fireEvent.keyDown(window, {
        key: modifier,
        ctrlKey: isCtrl,
        metaKey: isMeta,
      });
      fireEvent.keyDown(window, {
        key: "Z",
        ctrlKey: isCtrl,
        metaKey: isMeta,
        shiftKey: true,
      });
      fireEvent.keyUp(window, {
        key: "Z",
        ctrlKey: isCtrl,
        metaKey: isMeta,
        shiftKey: true,
      });

      expect(onRestoreTask).toHaveBeenCalled();
    });

    it("should not trigger restore when only 'z' is pressed without Meta", async () => {
      const onRestoreTask = jest.fn();
      const config = { ...defaultConfig, onRestoreTask };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      pressKey("z");

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

      const modifier = getModifierKey();
      const isCtrl = modifier === "Control";
      const isMeta = modifier === "Meta";
      fireEvent.keyDown(window, {
        key: modifier,
        ctrlKey: isCtrl,
        metaKey: isMeta,
      });
      fireEvent.keyDown(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });
      fireEvent.keyUp(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });

      // Should call event restore, not task restore
      expect(onRestoreEvent).toHaveBeenCalled();
      expect(onRestoreTask).not.toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(eventUndoToastId);
      expect(toast.dismiss).not.toHaveBeenCalledWith(undoToastId);
    });

    it("should call event restore", async () => {
      const windowsUAMock = mockWindowsUserAgent();
      const onRestoreEvent = jest.fn();
      const eventUndoToastId = "event-toast-789";
      const config = { ...defaultConfig, onRestoreEvent, eventUndoToastId };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifier = getModifierKey();
      const isCtrl = modifier === "Control";
      const isMeta = modifier === "Meta";
      fireEvent.keyDown(window, {
        key: modifier,
        ctrlKey: isCtrl,
        metaKey: isMeta,
      });
      fireEvent.keyDown(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });
      fireEvent.keyUp(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });

      expect(onRestoreEvent).toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(eventUndoToastId);

      windowsUAMock.mockRestore();
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
      };

      await act(() => renderHook(() => useDayViewShortcuts(config)));

      const modifier = getModifierKey();
      const isCtrl = modifier === "Control";
      const isMeta = modifier === "Meta";
      fireEvent.keyDown(window, {
        key: modifier,
        ctrlKey: isCtrl,
        metaKey: isMeta,
      });
      fireEvent.keyDown(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });
      fireEvent.keyUp(window, { key: "z", ctrlKey: isCtrl, metaKey: isMeta });

      // Should call task restore since no event undo exists
      expect(onRestoreTask).toHaveBeenCalled();
      expect(onRestoreEvent).not.toHaveBeenCalled();
      expect(toast.dismiss).toHaveBeenCalledWith(undoToastId);
    });
  });
});
