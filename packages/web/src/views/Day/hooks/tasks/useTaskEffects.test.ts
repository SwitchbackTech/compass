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
  const mockLoadTasksFromIndexedDB = jest.mocked(loadTasksFromIndexedDB);
  const mockSaveTasksToIndexedDB = jest.mocked(saveTasksToIndexedDB);
  const mockSortTasksByStatus = jest.mocked(sortTasksByStatus);
  const mockSetTasks = jest.fn();
  const dateKey = "2024-01-01";
  const mockTask: Task = {
    id: "task-1",
    title: "Task 1",
    status: "todo",
    order: 0,
    createdAt: new Date().toISOString(),
  };
  const strictModeWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(StrictMode, null, children);

  const renderUseTaskEffects = (
    tasks: Task[] = [],
    wrapper?: ({
      children,
    }: {
      children: React.ReactNode;
    }) => React.ReactElement,
  ) =>
    renderHook(
      ({ tasks: currentTasks }) =>
        useTaskEffects({
          tasks: currentTasks,
          dateKey,
          setTasks: mockSetTasks,
        }),
      {
        initialProps: { tasks },
        wrapper,
      },
    );

  const applyLatestSetTasksUpdate = (prevTasks: Task[]): Task[] => {
    const latestSetTasksArg = mockSetTasks.mock.lastCall?.[0];
    if (typeof latestSetTasksArg === "function") {
      return latestSetTasksArg(prevTasks);
    }

    return latestSetTasksArg ?? [];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadTasksFromIndexedDB.mockResolvedValue([]);
    mockSaveTasksToIndexedDB.mockResolvedValue(undefined);
    mockSortTasksByStatus.mockImplementation((tasks) => tasks);
  });

  it("should load tasks from IndexedDB on mount", async () => {
    const loadedTasks = [mockTask];
    mockLoadTasksFromIndexedDB.mockResolvedValue(loadedTasks);
    mockSortTasksByStatus.mockReturnValue(loadedTasks);

    renderUseTaskEffects();

    await waitFor(() => {
      expect(mockLoadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
      expect(mockSortTasksByStatus).toHaveBeenCalledWith(loadedTasks);
      expect(applyLatestSetTasksUpdate([])).toEqual(loadedTasks);
    });
  });

  it("should guard saves until the first load for the date completes", async () => {
    renderUseTaskEffects([mockTask]);

    expect(mockLoadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
    expect(mockSaveTasksToIndexedDB).not.toHaveBeenCalled();
  });

  it("should save tasks after initial load completes and tasks change", async () => {
    const { rerender } = renderUseTaskEffects();

    await waitFor(() => {
      expect(mockLoadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
    });

    rerender({ tasks: [mockTask] });

    await waitFor(() => {
      expect(mockSaveTasksToIndexedDB).toHaveBeenCalledWith(dateKey, [
        mockTask,
      ]);
    });
  });

  it("should handle load error gracefully", async () => {
    const error = new Error("Load failed");
    mockLoadTasksFromIndexedDB.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    renderUseTaskEffects();

    await waitFor(() => {
      expect(mockLoadTasksFromIndexedDB).toHaveBeenCalledWith(dateKey);
      expect(mockSetTasks).toHaveBeenCalledWith([]);
    });
    expect(mockSaveTasksToIndexedDB).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should load tasks in React StrictMode", async () => {
    const loadedTasks = [mockTask];
    mockLoadTasksFromIndexedDB.mockResolvedValue(loadedTasks);
    mockSortTasksByStatus.mockReturnValue(loadedTasks);

    renderUseTaskEffects([], strictModeWrapper);

    await waitFor(() => {
      expect(mockSetTasks).toHaveBeenCalled();
      expect(applyLatestSetTasksUpdate([])).toEqual(loadedTasks);
    });
  });
});
