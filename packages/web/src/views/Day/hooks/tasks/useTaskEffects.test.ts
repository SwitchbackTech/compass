import { renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromIndexedDB,
  saveTasksToIndexedDB,
} from "@web/common/utils/storage/task.storage.util";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";
import { useTaskEffects } from "./useTaskEffects";

jest.mock("@web/common/utils/storage/task.storage.util");
jest.mock("@web/common/utils/task/sort.task");

describe("useTaskEffects", () => {
  const mockSetTasks = jest.fn();
  const dateKey = "2024-01-01";
  const mockTask: Task = {
    id: "task-1",
    title: "Task 1",
    status: "todo",
    order: 0,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (loadTasksFromIndexedDB as jest.Mock).mockResolvedValue([]);
    (saveTasksToIndexedDB as jest.Mock).mockResolvedValue(undefined);
    (sortTasksByStatus as jest.Mock).mockImplementation((tasks) => tasks);
  });

  it("should load tasks from IndexedDB on mount", async () => {
    const loadedTasks = [mockTask];
    (loadTasksFromIndexedDB as jest.Mock).mockResolvedValue(loadedTasks);
    (sortTasksByStatus as jest.Mock).mockReturnValue(loadedTasks);

    const { result } = renderHook(() =>
      useTaskEffects({
        tasks: [],
        dateKey,
        setTasks: mockSetTasks,
      }),
    );

    await waitFor(() => {
      expect(loadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
      expect(sortTasksByStatus).toHaveBeenCalledWith(loadedTasks);
      expect(mockSetTasks).toHaveBeenCalledWith(loadedTasks);
    });
  });

  it("should not save tasks before initial load completes", async () => {
    // Mock load to never resolve to simulate loading state?
    // No, useTaskEffects sets isLoadingRef.current = true.
    // But we want to test that saveTasksToIndexedDB is NOT called if syncedDateKey is null.

    renderHook(() =>
      useTaskEffects({
        tasks: [mockTask],
        dateKey,
        setTasks: mockSetTasks,
      }),
    );

    // Initial load is triggered
    expect(loadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);

    // But save should not happen yet because syncedDateKey hasn't been set (it's set after load completes)
    // Wait for the load promise to resolve?
    // Actually, saveTasks is inside a separate useEffect that depends on syncedDateKey.
    // Initially syncedDateKey is null.
    // So saveTasks should not run.

    expect(saveTasksToIndexedDB).not.toHaveBeenCalled();
  });

  it("should save tasks after initial load completes and tasks change", async () => {
    const { rerender } = renderHook(
      (props) =>
        useTaskEffects({
          tasks: props.tasks,
          dateKey,
          setTasks: mockSetTasks,
        }),
      {
        initialProps: { tasks: [] as Task[] },
      },
    );

    // Wait for initial load to complete and syncedDateKey to be set
    await waitFor(() => {
      expect(loadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
    });

    // Now update tasks, which should trigger save
    rerender({ tasks: [mockTask] });

    await waitFor(() => {
      expect(saveTasksToIndexedDB).toHaveBeenCalledWith(dateKey, [mockTask]);
    });
  });

  it("should handle load error gracefully", async () => {
    const error = new Error("Load failed");
    (loadTasksFromIndexedDB as jest.Mock).mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    renderHook(() =>
      useTaskEffects({
        tasks: [],
        dateKey,
        setTasks: mockSetTasks,
      }),
    );

    await waitFor(() => {
      expect(loadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
      expect(mockSetTasks).toHaveBeenCalledWith([]); // Should set empty tasks on error
    });

    consoleSpy.mockRestore();
  });
});
