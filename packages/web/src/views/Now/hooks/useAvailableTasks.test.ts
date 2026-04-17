import { renderHook, waitFor } from "@testing-library/react";
import React, { act } from "react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { type Task } from "@web/common/types/task.types";
import { TaskContext } from "@web/views/Day/context/TaskContext";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const actualStorageUtil =
  require("@web/common/utils/storage/storage.util") as typeof import("@web/common/utils/storage/storage.util");
const getDateKey = mock();
const loadTasksFromStorage = mock();

mock.module("@web/common/utils/storage/storage.util", () => ({
  ...actualStorageUtil,
  getDateKey,
  loadTasksFromStorage,
}));

const storageUtil =
  require("@web/common/utils/storage/storage.util") as typeof import("@web/common/utils/storage/storage.util");
const { useAvailableTasks } =
  require("./useAvailableTasks") as typeof import("./useAvailableTasks");

describe("useAvailableTasks", () => {
  const mockDateKey = "2025-11-15";

  beforeEach(() => {
    getDateKey.mockClear();
    loadTasksFromStorage.mockClear();
    getDateKey.mockReturnValue(mockDateKey);
    loadTasksFromStorage.mockResolvedValue([]);
  });

  afterEach(() => {
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

    loadTasksFromStorage.mockResolvedValue(mockTasks);

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

    loadTasksFromStorage.mockResolvedValue(mockTasks);

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

    loadTasksFromStorage.mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toHaveLength(3);
      expect(result.current.availableTasks[0]._id).toBe("task-2");
      expect(result.current.availableTasks[1]._id).toBe("task-3");
      expect(result.current.availableTasks[2]._id).toBe("task-1");
    });
  });

  it("returns empty array when no tasks exist", async () => {
    loadTasksFromStorage.mockResolvedValue([]);

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

    loadTasksFromStorage
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

    loadTasksFromStorage.mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    const initialCallCount = loadTasksFromStorage.mock.calls.length;

    act(() => {
      dispatchStorageEvent("compass.reminder");
    });

    await waitFor(() => {
      expect(loadTasksFromStorage.mock.calls).toHaveLength(initialCallCount);
      expect(result.current.availableTasks).toHaveLength(1);
    });
  });

  it("handles storage clear event", async () => {
    const mockTasks: Task[] = [createMockTask()];

    loadTasksFromStorage
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

    loadTasksFromStorage.mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useAvailableTasks());

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual(mockTasks);
      expect(result.current.hasCompletedTasks).toBe(true);
    });
  });

  it("returns hasCompletedTasks as false when no tasks exist", async () => {
    loadTasksFromStorage.mockResolvedValue([]);

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

    loadTasksFromStorage
      .mockReturnValueOnce(staleLoadPromise)
      .mockResolvedValueOnce(freshTasks);

    let taskContextValue: React.ContextType<typeof TaskContext>;
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

    resolveStaleLoad?.(staleTasks);
    await Promise.resolve();

    expect(result.current.allTasks).toEqual(freshTasks);
  });
});

function dispatchStorageEvent(key: string | null) {
  const event = new Event("storage") as StorageEvent;
  Object.defineProperty(event, "key", { value: key });
  window.dispatchEvent(event);
}
