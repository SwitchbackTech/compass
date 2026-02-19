import { act, renderHook, waitFor } from "@testing-library/react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { Task } from "@web/common/types/task.types";
import { useFocusedTask } from "./useFocusedTask";

describe("useFocusedTask", () => {
  const mockTask = createMockTask({
    _id: "task-1",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
  });
  const secondTask = createMockTask({
    _id: "task-2",
    status: "todo",
    createdAt: "2025-11-15T11:00:00Z",
  });
  const mockTasks: Task[] = [mockTask, secondTask];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("manual focus management", () => {
    it("returns null when no task is focused", () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      expect(result.current.focusedTask).toBeNull();
    });

    it("sets a focused task when setFocusedTask is called with valid task ID", async () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: mockTasks }),
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });

      act(() => {
        result.current.setFocusedTask(secondTask._id);
      });

      expect(result.current.focusedTask).toEqual(secondTask);
    });

    it("does not keep focus on non-available task ids", async () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: mockTasks }),
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });

      act(() => {
        result.current.setFocusedTask("non-existent-task");
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });
    });

    it("clears focused task when no tasks are available", () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      act(() => {
        result.current.setFocusedTask(null);
      });

      expect(result.current.focusedTask).toBeNull();
    });
  });

  describe("auto-focus behavior", () => {
    it("auto-focuses on the first available task when none is focused", async () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: mockTasks }),
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });
    });

    it("does not auto-focus when no tasks are available", async () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toBeNull();
      });
    });

    it("auto-focuses when available tasks change from empty to non-empty", async () => {
      const { result, rerender } = renderHook(
        ({ availableTasks }) => useFocusedTask({ availableTasks }),
        {
          initialProps: {
            availableTasks: [] as Task[],
          },
        },
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toBeNull();
      });

      rerender({ availableTasks: mockTasks });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });
    });

    it("auto-focuses when focused task becomes null but tasks are available", async () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: mockTasks }),
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });

      act(() => {
        result.current.setFocusedTask(secondTask._id);
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(secondTask);
      });

      act(() => {
        result.current.setFocusedTask(null);
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });
    });

    it("does not override a focused task when available tasks change", async () => {
      const { result, rerender } = renderHook(
        ({ availableTasks }) => useFocusedTask({ availableTasks }),
        {
          initialProps: {
            availableTasks: mockTasks,
          },
        },
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });

      act(() => {
        result.current.setFocusedTask(secondTask._id);
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(secondTask);
      });

      const updatedTasks: Task[] = [
        secondTask,
        createMockTask({
          _id: "task-3",
          status: "todo",
          createdAt: "2025-11-15T12:00:00Z",
        }),
      ];

      rerender({ availableTasks: updatedTasks });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(secondTask);
      });
    });

    it("falls back to the first task when the focused task disappears", async () => {
      const thirdTask = createMockTask({
        _id: "task-3",
        status: "todo",
        createdAt: "2025-11-15T12:00:00Z",
      });
      const { result, rerender } = renderHook(
        ({ availableTasks }) => useFocusedTask({ availableTasks }),
        {
          initialProps: {
            availableTasks: mockTasks,
          },
        },
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });

      act(() => {
        result.current.setFocusedTask(secondTask._id);
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(secondTask);
      });

      rerender({ availableTasks: [thirdTask, mockTask] });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(thirdTask);
      });
    });
  });
});
