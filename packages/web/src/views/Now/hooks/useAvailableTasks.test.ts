import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/views/Day/task.types";
import * as storageUtil from "@web/views/Day/util/storage.util";
import { useAvailableTasks } from "./useAvailableTasks";

jest.mock("@web/views/Day/util/storage.util", () => ({
  ...jest.requireActual("@web/views/Day/util/storage.util"),
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
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Task 2",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    expect(storageUtil.getDateKey).toHaveBeenCalledWith(mockToday.toDate());
    expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledWith(mockDateKey);
    expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      // Tasks are sorted by creation date (newest first), so task-2 comes before task-1
      expect(result.current.availableTasks).toHaveLength(2);
      expect(result.current.availableTasks[0].id).toBe("task-2");
      expect(result.current.availableTasks[1].id).toBe("task-1");
    });
  });

  it("filters out completed tasks", async () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Task 2",
        status: "completed",
        createdAt: "2025-11-15T11:00:00Z",
      },
      {
        id: "task-3",
        title: "Task 3",
        status: "todo",
        createdAt: "2025-11-15T12:00:00Z",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(2);
      expect(result.current.availableTasks[0].id).toBe("task-3");
      expect(result.current.availableTasks[1].id).toBe("task-1");
      expect(
        result.current.availableTasks.every((task) => task.status === "todo"),
      ).toBe(true);
    });
  });

  it("sorts tasks by creation date (newest first)", async () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Task 2",
        status: "todo",
        createdAt: "2025-11-15T12:00:00Z",
      },
      {
        id: "task-3",
        title: "Task 3",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(3);
      expect(result.current.availableTasks[0].id).toBe("task-2");
      expect(result.current.availableTasks[1].id).toBe("task-3");
      expect(result.current.availableTasks[2].id).toBe("task-1");
    });
  });

  it("returns empty array when no tasks exist", async () => {
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
    });
  });

  it("reloads tasks when storage changes", async () => {
    const initialTasks: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
    ];

    const updatedTasks: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Task 2",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
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
      const storageEvent = new StorageEvent("storage", {
        key: "compass.today.tasks.2025-11-15",
      });
      window.dispatchEvent(storageEvent);
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(2);
    });
  });

  it("does not reload tasks when unrelated storage key changes", async () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    const initialCallCount = (storageUtil.loadTasksFromStorage as jest.Mock)
      .mock.calls.length;

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "compass.reminder",
      });
      window.dispatchEvent(storageEvent);
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
        id: "task-1",
        title: "Task 1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
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
      const storageEvent = new StorageEvent("storage", {
        key: null,
      });
      window.dispatchEvent(storageEvent);
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
    });
  });
});
