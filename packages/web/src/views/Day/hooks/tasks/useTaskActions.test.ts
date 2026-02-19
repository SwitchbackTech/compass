import dayjs from "dayjs";
import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task } from "@web/common/types/task.types";
import { showMigrationToast } from "@web/views/Day/components/Toasts/MigrationToast/MigrationToast";
import { useTaskActions } from "./useTaskActions";

jest.mock(
  "@web/views/Day/components/Toasts/MigrationToast/MigrationToast",
  () => ({
    showMigrationToast: jest.fn(),
  }),
);

describe("useTaskActions - migration", () => {
  const mockSetTasks = jest.fn();
  const mockSetUndoState = jest.fn();
  const mockSetUndoToastId = jest.fn();
  const mockDateInView = dayjs("2025-10-27");
  const mockNavigateToNextDay = jest.fn();
  const mockNavigateToPreviousDay = jest.fn();
  const mockTaskRepository: jest.Mocked<TaskRepository> = {
    get: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    saveTask: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    move: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
  };

  const mockTask = createMockTask({ _id: "task-1" });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskRepository.get.mockResolvedValue([]);
    mockTaskRepository.save.mockResolvedValue(undefined);
    mockTaskRepository.saveTask.mockResolvedValue(undefined);
    mockTaskRepository.delete.mockResolvedValue(undefined);
    mockTaskRepository.move.mockResolvedValue(undefined);
    mockTaskRepository.reorder.mockResolvedValue(undefined);
    (showMigrationToast as jest.Mock).mockReturnValue("toast-id-123");
  });

  it("migrates task forward one day", async () => {
    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks: [mockTask],
        taskRepository: mockTaskRepository,
        dateInView: mockDateInView,
        navigateToNextDay: mockNavigateToNextDay,
        navigateToPreviousDay: mockNavigateToPreviousDay,
        setUndoState: mockSetUndoState,
        setUndoToastId: mockSetUndoToastId,
      }),
    );

    act(() => {
      result.current.migrateTask(mockTask._id, "forward");
    });

    // Should store migration operation
    expect(mockSetUndoState).toHaveBeenCalledWith({
      type: "migrate",
      task: mockTask,
      fromDate: "2025-10-27",
      direction: "forward",
    });

    // Should remove task from current day
    expect(mockSetTasks).toHaveBeenCalledWith(expect.any(Function));

    // Verify task is removed from the array
    const setTasksCall = mockSetTasks.mock.calls[0][0];
    const updatedTasks = setTasksCall([mockTask]);
    expect(updatedTasks).toEqual([]);

    // Should move task from current date to next date (async call)
    expect(mockTaskRepository.move).toHaveBeenCalledWith(
      mockTask,
      "2025-10-27",
      "2025-10-28",
    );

    // Should show migration toast with undo callback
    expect(showMigrationToast).toHaveBeenCalledWith(
      "forward",
      mockNavigateToNextDay,
      expect.any(Function),
    );

    // Should store toast ID
    expect(mockSetUndoToastId).toHaveBeenCalledWith("toast-id-123");
  });

  it("migrates task backward one day", async () => {
    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks: [mockTask],
        taskRepository: mockTaskRepository,
        dateInView: mockDateInView,
        navigateToNextDay: mockNavigateToNextDay,
        navigateToPreviousDay: mockNavigateToPreviousDay,
        setUndoState: mockSetUndoState,
        setUndoToastId: mockSetUndoToastId,
      }),
    );

    act(() => {
      result.current.migrateTask(mockTask._id, "backward");
    });

    // Should store migration operation
    expect(mockSetUndoState).toHaveBeenCalledWith({
      type: "migrate",
      task: mockTask,
      fromDate: "2025-10-27",
      direction: "backward",
    });

    // Should remove task from current day
    expect(mockSetTasks).toHaveBeenCalledWith(expect.any(Function));

    // Verify task is removed from the array
    const setTasksCall = mockSetTasks.mock.calls[0][0];
    const updatedTasks = setTasksCall([mockTask]);
    expect(updatedTasks).toEqual([]);

    // Should move task from current date to previous date (async call)
    expect(mockTaskRepository.move).toHaveBeenCalledWith(
      mockTask,
      "2025-10-27",
      "2025-10-26",
    );

    // Should show migration toast with undo callback
    expect(showMigrationToast).toHaveBeenCalledWith(
      "backward",
      mockNavigateToPreviousDay,
      expect.any(Function),
    );

    // Should store toast ID
    expect(mockSetUndoToastId).toHaveBeenCalledWith("toast-id-123");
  });

  describe("undo migration", () => {
    it("restores migrated task when on the same date", async () => {
      const undoState = {
        type: "migrate" as const,
        task: mockTask,
        fromDate: "2025-10-27",
        direction: "forward" as const,
      };

      const { result } = renderHook(() =>
        useTaskActions({
          setTasks: mockSetTasks,
          tasks: [],
          taskRepository: mockTaskRepository,
          dateInView: mockDateInView,
          navigateToNextDay: mockNavigateToNextDay,
          navigateToPreviousDay: mockNavigateToPreviousDay,
          undoState,
          setUndoState: mockSetUndoState,
          setUndoToastId: mockSetUndoToastId,
        }),
      );

      mockTaskRepository.get.mockResolvedValueOnce([mockTask]);

      act(() => {
        result.current.restoreTask();
      });

      // Should add task back to the current day
      expect(mockSetTasks).toHaveBeenCalledWith(expect.any(Function));
      const setTasksCall = mockSetTasks.mock.calls[0][0];
      const updatedTasks = setTasksCall([]);
      expect(updatedTasks).toEqual([mockTask]);

      await waitFor(() => {
        expect(mockTaskRepository.save).toHaveBeenCalledWith("2025-10-28", []);
      });
      expect(mockTaskRepository.saveTask).toHaveBeenCalledWith(
        "2025-10-27",
        mockTask,
      );

      // Should clear undo state
      expect(mockSetUndoState).toHaveBeenCalledWith(null);
      expect(mockSetUndoToastId).toHaveBeenCalledWith(null);
    });

    it("restores backward migrated task correctly", async () => {
      const undoState = {
        type: "migrate" as const,
        task: mockTask,
        fromDate: "2025-10-27",
        direction: "backward" as const,
      };

      const { result } = renderHook(() =>
        useTaskActions({
          setTasks: mockSetTasks,
          tasks: [],
          taskRepository: mockTaskRepository,
          dateInView: mockDateInView,
          navigateToNextDay: mockNavigateToNextDay,
          navigateToPreviousDay: mockNavigateToPreviousDay,
          undoState,
          setUndoState: mockSetUndoState,
          setUndoToastId: mockSetUndoToastId,
        }),
      );

      mockTaskRepository.get.mockResolvedValueOnce([mockTask]);

      act(() => {
        result.current.restoreTask();
      });

      await waitFor(() => {
        expect(mockTaskRepository.save).toHaveBeenCalledWith("2025-10-26", []);
      });
      expect(mockTaskRepository.saveTask).toHaveBeenCalledWith(
        "2025-10-27",
        mockTask,
      );
    });

    it("does not restore if dateInView has changed", () => {
      const undoState = {
        type: "migrate" as const,
        task: mockTask,
        fromDate: "2025-10-27",
        direction: "forward" as const,
      };

      const { result } = renderHook(() =>
        useTaskActions({
          setTasks: mockSetTasks,
          tasks: [],
          taskRepository: mockTaskRepository,
          dateInView: dayjs("2025-10-28"), // Different date
          navigateToNextDay: mockNavigateToNextDay,
          navigateToPreviousDay: mockNavigateToPreviousDay,
          undoState,
          setUndoState: mockSetUndoState,
          setUndoToastId: mockSetUndoToastId,
        }),
      );

      act(() => {
        result.current.restoreTask();
      });

      // Should not add task back (different date)
      expect(mockSetTasks).not.toHaveBeenCalled();

      // Should still clear undo state
      expect(mockSetUndoState).toHaveBeenCalledWith(null);
      expect(mockSetUndoToastId).toHaveBeenCalledWith(null);
    });

    it("prioritizes deleted task over migrated task in restoreTask", () => {
      const deletedUndoState = {
        type: "delete" as const,
        task: {
          _id: "deleted-task",
          title: "Deleted Task",
          status: "todo" as const,
          createdAt: "2025-10-27T10:00:00Z",
          order: 0,
        },
      };

      const { result } = renderHook(() =>
        useTaskActions({
          setTasks: mockSetTasks,
          tasks: [],
          taskRepository: mockTaskRepository,
          dateInView: mockDateInView,
          navigateToNextDay: mockNavigateToNextDay,
          navigateToPreviousDay: mockNavigateToPreviousDay,
          undoState: deletedUndoState,
          setUndoState: mockSetUndoState,
          setUndoToastId: mockSetUndoToastId,
        }),
      );

      act(() => {
        result.current.restoreTask();
      });

      // Should restore deleted task
      expect(mockSetTasks).toHaveBeenCalledWith(expect.any(Function));
      const setTasksCall = mockSetTasks.mock.calls[0][0];
      const updatedTasks = setTasksCall([]);
      expect(updatedTasks).toEqual([deletedUndoState.task]);

      // Should clear undo state
      expect(mockSetUndoState).toHaveBeenCalledWith(null);
      expect(mockSetUndoToastId).toHaveBeenCalledWith(null);
    });
  });
});

describe("useTaskActions - reorderTasks", () => {
  const mockSetTasks = jest.fn();
  const mockTaskRepository: jest.Mocked<TaskRepository> = {
    get: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    saveTask: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    move: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
  };

  const createTask = (
    _id: string,
    title: string,
    status: "todo" | "completed",
    order: number,
  ): Task => ({
    _id,
    title,
    status,
    order,
    createdAt: new Date().toISOString(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("moves task to new position and updates order within status groups", () => {
    const tasks = [
      createTask("task-1", "Task 1", "todo", 0),
      createTask("task-2", "Task 2", "todo", 1),
      createTask("task-3", "Task 3", "todo", 2),
    ];

    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks,
        taskRepository: mockTaskRepository,
      }),
    );

    act(() => {
      result.current.reorderTasks(0, 2);
    });

    expect(mockSetTasks).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetTasks.mock.calls[0][0];
    const newTasks = updater(tasks);

    expect(newTasks[0]._id).toBe("task-2");
    expect(newTasks[1]._id).toBe("task-3");
    expect(newTasks[2]._id).toBe("task-1");
    expect(newTasks[0].order).toBe(0);
    expect(newTasks[1].order).toBe(1);
    expect(newTasks[2].order).toBe(2);
  });

  it("preserves display order when reordering across status boundaries", () => {
    const tasks = [
      createTask("todo-1", "Todo", "todo", 0),
      createTask("done-1", "Done", "completed", 0),
    ];

    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks,
        taskRepository: mockTaskRepository,
      }),
    );

    act(() => {
      result.current.reorderTasks(0, 1);
    });

    const updater = mockSetTasks.mock.calls[0][0];
    const newTasks = updater(tasks);

    expect(newTasks[0]._id).toBe("done-1");
    expect(newTasks[1]._id).toBe("todo-1");
    expect(newTasks[0].order).toBe(0);
    expect(newTasks[1].order).toBe(0);
  });

  it("returns new task objects without mutating originals", () => {
    const tasks = [
      createTask("task-1", "Task 1", "todo", 0),
      createTask("task-2", "Task 2", "todo", 1),
    ];

    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks,
        taskRepository: mockTaskRepository,
      }),
    );

    act(() => {
      result.current.reorderTasks(0, 1);
    });

    const updater = mockSetTasks.mock.calls[0][0];
    const newTasks = updater(tasks);

    expect(newTasks).not.toBe(tasks);
    expect(newTasks[0]).not.toBe(tasks[1]);
    expect(newTasks[0]).toEqual({ ...tasks[1], order: 0 });
  });

  it("blocks reordering while tasks are loading", () => {
    const tasks = [
      createTask("task-1", "Task 1", "todo", 0),
      createTask("task-2", "Task 2", "todo", 1),
    ];

    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks,
        taskRepository: mockTaskRepository,
        isLoadingTasks: true,
      }),
    );

    act(() => {
      result.current.reorderTasks(0, 1);
    });

    expect(mockSetTasks).not.toHaveBeenCalled();
  });
});
