import React, { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { Task } from "@web/common/types/task.types";
import * as storageUtil from "@web/common/utils/storage/storage.util";
import { TaskContext } from "@web/views/Day/context/TaskContext";
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
    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue([]);

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
      createMockTask({
        _id: "task-1",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      }),
      createMockTask({
        _id: "task-2",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      }),
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue(
      mockTasks,
    );

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
    const mockTasks = [
      createMockTask({
        _id: "task-1",
        status: "todo",
      }),
      createMockTask({
        _id: "task-2",
        status: "completed",
      }),
      createMockTask({
        _id: "task-3",
        status: "todo",
      }),
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue(
      mockTasks,
    );

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
      createMockTask({
        _id: "task-1",
        createdAt: "2025-11-15T10:00:00Z",
      }),
      createMockTask({
        _id: "task-2",
        createdAt: "2025-11-15T12:00:00Z",
      }),
      createMockTask({
        _id: "task-3",
        createdAt: "2025-11-15T11:00:00Z",
      }),
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue(
      mockTasks,
    );

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(3);
      expect(result.current.availableTasks[0]._id).toBe("task-2");
      expect(result.current.availableTasks[1]._id).toBe("task-3");
      expect(result.current.availableTasks[2]._id).toBe("task-1");
    });
  });

  it("returns empty array when no tasks exist", async () => {
    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("reloads tasks when storage changes", async () => {
    const initialTasks: Task[] = [createMockTask()];
    const updatedTasks: Task[] = [createMockTask(), createMockTask()];

    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockResolvedValueOnce(initialTasks)
      .mockResolvedValueOnce(updatedTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(1);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(storageUtil.COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey: mockDateKey },
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(2);
    });
  });

  it("does not reload tasks when unrelated storage key changes", async () => {
    const mockTasks: Task[] = [createMockTask()];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue(
      mockTasks,
    );

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
    const mockTasks: Task[] = [createMockTask()];

    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockResolvedValueOnce(mockTasks)
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(1);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(storageUtil.COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey: mockDateKey },
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("returns hasCompletedTasks as true when all tasks are completed", async () => {
    const mockTasks: Task[] = [
      createMockTask({
        status: "completed",
      }),
      createMockTask({
        status: "completed",
      }),
    ];

    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue(
      mockTasks,
    );

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual(mockTasks);
      expect(result.current.hasCompletedTasks).toBe(true);
    });
  });

  it("returns hasCompletedTasks as false when no tasks exist", async () => {
    (storageUtil.loadTasksFromStorage as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("ignores stale async task loads after effect cleanup", async () => {
    const staleTasks: Task[] = [
      createMockTask({
        _id: "stale-task-1",
        createdAt: "2025-11-15T08:00:00Z",
      }),
    ];
    const freshTasks: Task[] = [
      createMockTask({
        _id: "fresh-task-1",
        createdAt: "2025-11-15T12:00:00Z",
      }),
    ];

    let resolveStaleLoad: ((value: Task[]) => void) | null = null;
    const staleLoadPromise = new Promise<Task[]>((resolve) => {
      resolveStaleLoad = resolve;
    });

    (storageUtil.loadTasksFromStorage as jest.Mock)
      .mockReturnValueOnce(staleLoadPromise)
      .mockResolvedValueOnce(freshTasks);

    let taskContextValue: React.ContextType<typeof TaskContext> = undefined;
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      if (taskContextValue) {
        return React.createElement(
          TaskContext.Provider,
          { value: taskContextValue },
          children,
        );
      }
      return React.createElement(React.Fragment, null, children);
    };

    const { result, rerender } = renderHook(() => useAvailableTasks(), {
      wrapper,
    });

    await waitFor(() => {
      expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledTimes(1);
    });

    taskContextValue = { tasks: [] } as React.ContextType<typeof TaskContext>;
    rerender();

    taskContextValue = undefined;
    rerender();

    await waitFor(() => {
      expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledTimes(2);
      expect(result.current.allTasks).toEqual(freshTasks);
    });

    await act(async () => {
      resolveStaleLoad?.(staleTasks);
      await Promise.resolve();
    });

    expect(result.current.allTasks).toEqual(freshTasks);
  });
});

function dispatchStorageEvent(key: string | null) {
  const event = new Event("storage") as StorageEvent;
  Object.defineProperty(event, "key", { value: key });
  window.dispatchEvent(event);
}
