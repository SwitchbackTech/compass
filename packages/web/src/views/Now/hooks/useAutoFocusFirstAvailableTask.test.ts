import { act, renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/views/Day/task.types";
import { useTaskFocus } from "./useTaskFocus";

describe("useAutoFocusFirstAvailableTask", () => {
  const mockSetFocusedTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetFocusedTask.mockClear();
  });

  it("auto-focuses on the first incomplete task when no task is focused", async () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Test Task",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Another Task",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      },
    ];

    renderHook(() =>
      useTaskFocus({
        focusedTask: null,
        availableTasks: mockTasks,
        setFocusedTask: mockSetFocusedTask,
      }),
    );

    await waitFor(() => {
      expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
      expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
    });
  });

  it("does not auto-focus when a task is already focused", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    const mockTasks: Task[] = [
      mockTask,
      {
        id: "task-2",
        title: "Another Task",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      },
    ];

    renderHook(() =>
      useTaskFocus({
        focusedTask: mockTask,
        availableTasks: mockTasks,
        setFocusedTask: mockSetFocusedTask,
      }),
    );

    await waitFor(() => {
      expect(mockSetFocusedTask).not.toHaveBeenCalled();
    });
  });

  it("does not auto-focus when no tasks are available", async () => {
    renderHook(() =>
      useTaskFocus({
        focusedTask: null,
        availableTasks: [],
        setFocusedTask: mockSetFocusedTask,
      }),
    );

    await waitFor(() => {
      expect(mockSetFocusedTask).not.toHaveBeenCalled();
    });
  });

  it("auto-focuses on the first task when available tasks change from empty to non-empty", async () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Test Task",
        status: "todo",
        createdAt: "2025-11-15T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Another Task",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      },
    ];

    const { rerender } = renderHook(
      ({ focusedTask, availableTasks }) =>
        useTaskFocus({
          focusedTask,
          availableTasks,
          setFocusedTask: mockSetFocusedTask,
        }),
      {
        initialProps: {
          focusedTask: null as Task | null,
          availableTasks: [] as Task[],
        },
      },
    );

    await waitFor(() => {
      expect(mockSetFocusedTask).not.toHaveBeenCalled();
    });

    mockSetFocusedTask.mockClear();

    rerender({
      focusedTask: null,
      availableTasks: mockTasks,
    });

    await waitFor(() => {
      expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
      expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
    });
  });

  it("auto-focuses when focused task becomes null but tasks were already available", async () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    const mockTasks: Task[] = [
      mockTask,
      {
        id: "task-2",
        title: "Another Task",
        status: "todo",
        createdAt: "2025-11-15T11:00:00Z",
      },
    ];

    const { rerender } = renderHook(
      ({ focusedTask, availableTasks }) =>
        useTaskFocus({
          focusedTask,
          availableTasks,
          setFocusedTask: mockSetFocusedTask,
        }),
      {
        initialProps: {
          focusedTask: mockTask,
          availableTasks: mockTasks,
        },
      },
    );

    await waitFor(() => {
      expect(mockSetFocusedTask).not.toHaveBeenCalled();
    });

    mockSetFocusedTask.mockClear();

    rerender({
      focusedTask: null,
      availableTasks: mockTasks,
    });

    await waitFor(() => {
      // Should auto-focus when focusedTask becomes null
      expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
      expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call setFocusedTask when focusedTask changes from one task to another", async () => {
    const mockTask1: Task = {
      id: "task-1",
      title: "Test Task 1",
      status: "todo",
      createdAt: "2025-11-15T10:00:00Z",
    };

    const mockTask2: Task = {
      id: "task-2",
      title: "Test Task 2",
      status: "todo",
      createdAt: "2025-11-15T11:00:00Z",
    };

    const mockTasks: Task[] = [mockTask1, mockTask2];

    const { rerender } = renderHook(
      ({ focusedTask, availableTasks }) =>
        useTaskFocus({
          focusedTask,
          availableTasks,
          setFocusedTask: mockSetFocusedTask,
        }),
      {
        initialProps: {
          focusedTask: mockTask1,
          availableTasks: mockTasks,
        },
      },
    );

    await waitFor(() => {
      expect(mockSetFocusedTask).not.toHaveBeenCalled();
    });

    mockSetFocusedTask.mockClear();

    rerender({
      focusedTask: mockTask2,
      availableTasks: mockTasks,
    });

    await waitFor(() => {
      // Should not auto-focus when switching between tasks
      expect(mockSetFocusedTask).not.toHaveBeenCalled();
    });
  });
});
