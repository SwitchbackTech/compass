import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/views/Day/task.types";
import * as storageUtil from "@web/views/Day/util/storage.util";
import { useFocusedTask } from "./useFocusedTask";

jest.mock("@web/views/Day/util/storage.util", () => ({
  ...jest.requireActual("@web/views/Day/util/storage.util"),
  loadTasksFromStorage: jest.fn(),
  getDateKey: jest.fn(),
}));

describe("useFocusedTask", () => {
  const mockToday = dayjs("2025-11-15T00:00:00Z").utc();
  const mockDateKey = "2025-11-15";

  beforeEach(() => {
    jest.clearAllMocks();
    (storageUtil.getDateKey as jest.Mock).mockReturnValue(mockDateKey);
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    // Use fake timers to control the current time
    jest.useFakeTimers();
    jest.setSystemTime(mockToday.toDate());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("returns null when no task is focused", async () => {
    const { result } = renderHook(() => useFocusedTask());

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
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
      expect(storageUtil.getDateKey).toHaveBeenCalledWith(mockToday.toDate());
      expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledWith(
        mockDateKey,
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
    });
  });

  it("clears focused task when setFocusedTask is called with null", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([mockTask]);

    const { result } = renderHook(() => useFocusedTask());

    // First set a task as focused
    act(() => {
      result.current.setFocusedTask("task-1");
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toEqual(mockTask);
    });

    // Then clear it
    act(() => {
      result.current.setFocusedTask(null);
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
    });
  });

  it("clears focused task when task is not found", async () => {
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useFocusedTask());

    act(() => {
      result.current.setFocusedTask("non-existent-task");
    });

    await waitFor(() => {
      expect(result.current.focusedTask).toBeNull();
    });
  });
});
