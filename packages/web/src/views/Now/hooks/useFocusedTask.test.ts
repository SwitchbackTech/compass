import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { Task } from "@web/views/Day/task.types";
import * as storageUtil from "@web/views/Day/util/storage.util";
import * as focusedTaskStorage from "../utils/focused-task-storage.util";
import { useFocusedTask } from "./useFocusedTask";

jest.mock("@web/views/Day/util/storage.util", () => ({
  ...jest.requireActual("@web/views/Day/util/storage.util"),
  loadTasksFromStorage: jest.fn(),
  getDateKey: jest.fn(),
}));

jest.mock("../utils/focused-task-storage.util", () => ({
  ...jest.requireActual("../utils/focused-task-storage.util"),
  getFocusedTaskId: jest.fn(),
  setFocusedTaskId: jest.fn(),
  clearFocusedTask: jest.fn(),
}));

describe("useFocusedTask", () => {
  const mockToday = dayjs("2025-11-15T00:00:00Z").utc();
  const mockDateKey = "2025-11-15";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (storageUtil.getDateKey as jest.Mock).mockReturnValue(mockDateKey);
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(null);

    // Use fake timers to control the current time
    jest.useFakeTimers();
    jest.setSystemTime(mockToday.toDate());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it("returns null when no focused task is stored", async () => {
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
    });
  });

  it("loads and returns an incomplete task when stored", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "task-1",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([mockTask]);

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(mockTask);
      expect(storageUtil.getDateKey).toHaveBeenCalledWith(mockToday.toDate());
      expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledWith(
        mockDateKey,
      );
    });
  });

  it("clears completed tasks when loaded from storage", async () => {
    const completedTask: Task = {
      id: "task-1",
      title: "Completed Task",
      status: "completed",
      createdAt: "2025-11-15T10:00:00Z",
    };

    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "task-1",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([
      completedTask,
    ]);

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
      expect(focusedTaskStorage.clearFocusedTask).toHaveBeenCalled();
    });
  });

  it("clears focused task when task is not found in storage", async () => {
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "non-existent-task",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
      expect(focusedTaskStorage.clearFocusedTask).toHaveBeenCalled();
    });
  });

  it("sets a focused task when setFocusedTask is called with valid task ID", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([mockTask]);

    const { result } = renderHook(() => useFocusedTask());

    act(() => {
      result.current.setFocusedTask("task-1");
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(mockTask);
      expect(focusedTaskStorage.setFocusedTaskId).toHaveBeenCalledWith(
        "task-1",
      );
    });
  });

  it("prevents setting a completed task as focused", async () => {
    const completedTask: Task = {
      id: "task-1",
      title: "Completed Task",
      status: "completed",
      createdAt: "2025-11-15T10:00:00Z",
    };

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([
      completedTask,
    ]);

    const { result } = renderHook(() => useFocusedTask());

    act(() => {
      result.current.setFocusedTask("task-1");
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
      expect(focusedTaskStorage.clearFocusedTask).toHaveBeenCalled();
      expect(focusedTaskStorage.setFocusedTaskId).not.toHaveBeenCalled();
    });
  });

  it("clears focused task when setFocusedTask is called with null", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "task-1",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([mockTask]);

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(mockTask);
    });

    act(() => {
      result.current.setFocusedTask(null);
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
      expect(focusedTaskStorage.clearFocusedTask).toHaveBeenCalled();
    });
  });

  it("reloads focused task when storage changes", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    // Initially no focused task
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(null);
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
    });

    // Update mocks for storage event
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "task-1",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([mockTask]);

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: STORAGE_KEYS.FOCUSED_TASK_ID,
      });
      window.dispatchEvent(storageEvent);
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(mockTask);
    });
  });

  it("reloads focused task when task storage changes", async () => {
    const initialTask: Task = {
      id: "task-1",
      title: "Initial Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    const updatedTask: Task = {
      id: "task-1",
      title: "Updated Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    // getFocusedTaskId is called on mount and when storage changes
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "task-1",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockReturnValueOnce([initialTask]) // initial mount
      .mockReturnValue([updatedTask]); // after storage event (and any subsequent calls)

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(initialTask);
    });

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "compass.today.tasks.2025-11-15",
      });
      window.dispatchEvent(storageEvent);
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(updatedTask);
    });
  });

  it("clears focused task when task becomes completed in storage", async () => {
    const incompleteTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    const completedTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "completed",
      createdAt: "2025-11-15T10:00:00Z",
    };

    // getFocusedTaskId is called on mount and when storage changes
    (focusedTaskStorage.getFocusedTaskId as jest.Mock).mockReturnValue(
      "task-1",
    );
    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockReturnValueOnce([incompleteTask]) // initial mount
      .mockReturnValue([completedTask]); // after storage event (and any subsequent calls)

    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(incompleteTask);
    });

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "compass.today.tasks.2025-11-15",
      });
      window.dispatchEvent(storageEvent);
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
      expect(focusedTaskStorage.clearFocusedTask).toHaveBeenCalled();
    });
  });
});
