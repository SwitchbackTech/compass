import { renderHook } from "@testing-library/react";
import { Task } from "../task.types";
import { useTaskSort } from "./useTaskSort";

describe("useTaskSort", () => {
  const mockSetTasks = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sort tasks on mount when there are mixed statuses", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Completed 1",
        status: "completed",
        createdAt: "2024-01-01T11:00:00Z",
      },
      {
        id: "task-3",
        title: "Todo 2",
        status: "todo",
        createdAt: "2024-01-01T12:00:00Z",
      },
    ];

    renderHook(() => useTaskSort(tasks, mockSetTasks));

    expect(mockSetTasks).toHaveBeenCalledWith([
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-3",
        title: "Todo 2",
        status: "todo",
        createdAt: "2024-01-01T12:00:00Z",
      },
      {
        id: "task-2",
        title: "Completed 1",
        status: "completed",
        createdAt: "2024-01-01T11:00:00Z",
      },
    ]);
  });

  it("should handle already-sorted tasks", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Todo 2",
        status: "todo",
        createdAt: "2024-01-01T11:00:00Z",
      },
      {
        id: "task-3",
        title: "Completed 1",
        status: "completed",
        createdAt: "2024-01-01T12:00:00Z",
      },
    ];

    renderHook(() => useTaskSort(tasks, mockSetTasks));

    expect(mockSetTasks).toHaveBeenCalledWith(tasks);
  });

  it("should only sort once on initial load", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Completed 1",
        status: "completed",
        createdAt: "2024-01-01T11:00:00Z",
      },
    ];

    const { rerender } = renderHook(() => useTaskSort(tasks, mockSetTasks));

    // Clear the first call
    mockSetTasks.mockClear();

    // Rerender with same tasks - should not call setTasks again
    rerender();
    rerender();

    expect(mockSetTasks).not.toHaveBeenCalled();
  });

  it("should not interfere with subsequent updates", () => {
    const initialTasks: Task[] = [
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Completed 1",
        status: "completed",
        createdAt: "2024-01-01T11:00:00Z",
      },
    ];

    const { rerender } = renderHook(
      ({ tasks }) => useTaskSort(tasks, mockSetTasks),
      {
        initialProps: { tasks: initialTasks },
      },
    );

    // Clear the initial call
    mockSetTasks.mockClear();

    // Update with new tasks - should not call setTasks (hook only sorts on initial load)
    const updatedTasks: Task[] = [
      ...initialTasks,
      {
        id: "task-3",
        title: "New todo",
        status: "todo",
        createdAt: "2024-01-01T13:00:00Z",
      },
    ];

    rerender({ tasks: updatedTasks });

    expect(mockSetTasks).not.toHaveBeenCalled();
  });

  it("should handle empty tasks array", () => {
    renderHook(() => useTaskSort([], mockSetTasks));

    expect(mockSetTasks).toHaveBeenCalledWith([]);
  });

  it("should handle tasks with only todos", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Todo 2",
        status: "todo",
        createdAt: "2024-01-01T11:00:00Z",
      },
    ];

    renderHook(() => useTaskSort(tasks, mockSetTasks));

    expect(mockSetTasks).toHaveBeenCalledWith(tasks);
  });

  it("should handle tasks with only completed", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        title: "Completed 1",
        status: "completed",
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Completed 2",
        status: "completed",
        createdAt: "2024-01-01T11:00:00Z",
      },
    ];

    renderHook(() => useTaskSort(tasks, mockSetTasks));

    expect(mockSetTasks).toHaveBeenCalledWith(tasks);
  });
});
