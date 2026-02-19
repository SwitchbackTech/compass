import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";
import * as storageUtil from "@web/common/utils/storage/storage.util";
import { useFocusedTask } from "./useFocusedTask";

jest.mock("@web/common/utils/storage/storage.util", () => ({
  ...jest.requireActual("@web/common/utils/storage/storage.util"),
  loadTasksFromStorage: jest.fn(),
  getDateKey: jest.fn(),
}));

describe("useFocusedTask", () => {
  const mockToday = dayjs("2025-11-15T00:00:00Z").utc();
  const mockDateKey = "2025-11-15";
  const mockTask: Task = {
    _id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
    order: 0,
    user: "user-1",
  };
  const secondTask: Task = {
    _id: "task-2",
    title: "Another Task",
    status: "todo",
    createdAt: "2025-11-15T11:00:00Z",
    order: 0,
    user: "user-1",
  };
  const mockTasks: Task[] = [mockTask, secondTask];

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
  });

  describe("manual focus management", () => {
    it("returns null when no task is focused", async () => {
      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      await waitFor(() => {
        expect(result.current.focusedTask).toBeNull();
      });
    });

    it("sets a focused task when setFocusedTask is called with valid task ID", async () => {
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([
        mockTask,
      ]);

      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      act(() => {
        result.current.setFocusedTask("task-1");
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
        expect(storageUtil.getDateKey).toHaveBeenCalledTimes(1);
        expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledWith(
          mockDateKey,
        );
      });
    });

    it("prevents setting a completed task as focused", async () => {
      const completedTask: Task = {
        _id: "task-1",
        title: "Completed Task",
        status: "completed",
        createdAt: "2025-11-15T10:00:00Z",
        order: 0,
        user: "user-1",
      };

      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([
        completedTask,
      ]);

      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      act(() => {
        result.current.setFocusedTask("task-1");
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toBeNull();
      });
    });

    it("clears focused task when setFocusedTask is called with null", async () => {
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([
        mockTask,
      ]);

      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      // First set a task as focused
      act(() => {
        result.current.setFocusedTask("task-1");
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });

      // Then clear it
      act(() => {
        result.current.setFocusedTask(null);
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toBeNull();
      });
    });

    it("clears focused task when task is not found", async () => {
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);

      const { result } = renderHook(() =>
        useFocusedTask({ availableTasks: [] }),
      );

      act(() => {
        result.current.setFocusedTask("non-existent-task");
      });

      await waitFor(() => {
        expect(result.current.focusedTask).toBeNull();
      });
    });
  });

  describe("auto-focus behavior", () => {
    it("auto-focuses on the first available task when none is focused", async () => {
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(
        mockTasks,
      );

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

      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(
        mockTasks,
      );

      rerender({ availableTasks: mockTasks });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(mockTask);
      });
    });

    it("auto-focuses when focused task becomes null but tasks are available", async () => {
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(
        mockTasks,
      );

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
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(
        mockTasks,
      );

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
        {
          _id: "task-3",
          title: "Third Task",
          status: "todo",
          createdAt: "2025-11-15T12:00:00Z",
          order: 0,
          user: "user-1",
        },
      ];

      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(
        updatedTasks,
      );

      rerender({ availableTasks: updatedTasks });

      await waitFor(() => {
        expect(result.current.focusedTask).toEqual(secondTask);
      });
    });
  });
});
