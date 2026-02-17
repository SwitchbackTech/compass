import React, { StrictMode } from "react";
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

    renderHook(() =>
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

  it("should guard saves until the first load for the date completes", async () => {
    renderHook(() =>
      useTaskEffects({
        tasks: [mockTask],
        dateKey,
        setTasks: mockSetTasks,
      }),
    );

    expect(loadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
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
    expect(saveTasksToIndexedDB).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should load tasks in React StrictMode", async () => {
    const loadedTasks = [mockTask];
    (loadTasksFromIndexedDB as jest.Mock).mockResolvedValue(loadedTasks);
    (sortTasksByStatus as jest.Mock).mockReturnValue(loadedTasks);

    renderHook(
      () =>
        useTaskEffects({
          tasks: [],
          dateKey,
          setTasks: mockSetTasks,
        }),
      {
        wrapper: ({ children }) =>
          React.createElement(StrictMode, null, children),
      },
    );

    await waitFor(() => {
      expect(mockSetTasks).toHaveBeenCalledWith(loadedTasks);
    });
  });
});
