import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";
import * as storageUtil from "@web/common/utils/storage/storage.util";
import { useAvailableTasks } from "./useAvailableTasks";

jest.mock("@web/common/utils/storage/storage.util", () => ({
  ...jest.requireActual("@web/common/utils/storage/storage.util"),
  loadTasksFromStorage: jest.fn(),
  getDateKey: jest.fn(),
}));

describe("useAvailableTasks", () => {
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
    localStorage.clear();
  });

  it("loads tasks from today only", async () => {
    const mockTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-2",
        title: "Task 2",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    expect(storageUtil.getDateKey).toHaveBeenCalled();
    expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledWith(mockDateKey);
    expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      // Tasks are sorted by creation date (newest first), so task-2 comes before task-1
      expect(result.current.availableTasks).toHaveLength(2);
      expect(result.current.availableTasks[0]._id).toBe("task-2");
      expect(result.current.availableTasks[1]._id).toBe("task-1");
      expect(result.current.allTasks).toEqual(mockTasks);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("filters out completed tasks", async () => {
    const mockTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-2",
        title: "Task 2",
        status: "completed",
        createdAt: "2025-11-15T11:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-3",
        title: "Task 3",
        status: "todo",
        createdAt: "2025-11-15T12:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(2);
      expect(result.current.availableTasks[0]._id).toBe("task-3");
      expect(result.current.availableTasks[1]._id).toBe("task-1");
      expect(
        result.current.availableTasks.every((task) => task.status === "todo"),
      ).toBe(true);
      expect(result.current.allTasks).toEqual(mockTasks);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("sorts tasks by creation date (newest first)", async () => {
    const mockTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-2",
        title: "Task 2",
        status: "todo",
        createdAt: "2025-11-15T12:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-3",
        title: "Task 3",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(3);
      expect(result.current.availableTasks[0]._id).toBe("task-2");
      expect(result.current.availableTasks[1]._id).toBe("task-3");
      expect(result.current.availableTasks[2]._id).toBe("task-1");
    });
  });

  it("returns empty array when no tasks exist", async () => {
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("reloads tasks when storage changes", async () => {
    const initialTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    const updatedTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-2",
        title: "Task 2",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockReturnValueOnce(initialTasks)
      .mockReturnValueOnce(updatedTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(1);
    });

    act(() => {
      dispatchStorageEvent(
        `${storageUtil.TODAY_TASKS_STORAGE_KEY_PREFIX}.${mockDateKey}`,
      );
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(2);
    });
  });

  it("does not reload tasks when unrelated storage key changes", async () => {
    const mockTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    const initialCallCount = (storageUtil.loadTasksFromStorage as jest.Mock)
      .mock.calls.length;

    act(() => {
      dispatchStorageEvent("compass.reminder");
    });

    await waitFor(() => {
      expect(
        (storageUtil.loadTasksFromStorage as jest.Mock).mock.calls,
      ).toHaveLength(initialCallCount);
      expect(result.current.availableTasks).toHaveLength(1);
    });
  });

  it("handles storage clear event", async () => {
    const mockTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockReturnValueOnce(mockTasks)
      .mockReturnValueOnce([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(1);
    });

    act(() => {
      dispatchStorageEvent(null);
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("returns hasCompletedTasks as true when all tasks are completed", async () => {
    const mockTasks: Task[] = [
      {
        _id: "task-1",
        title: "Task 1",
        status: "completed",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      },
      {
        _id: "task-2",
        title: "Task 2",
        status: "completed",
        createdAt: "2025-11-15T11:00:00Z",
        order: 0,
        user: "user-1",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual(mockTasks);
      expect(result.current.hasCompletedTasks).toBe(true);
    });
  });

  it("returns hasCompletedTasks as false when no tasks exist", async () => {
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });
});

function dispatchStorageEvent(key: string | null) {
  const event = new Event("storage") as StorageEvent;
  Object.defineProperty(event, "key", { value: key });
  window.dispatchEvent(event);
}
