import dayjs from "dayjs";
import { act, renderHook, waitFor } from "@testing-library/react";
import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task } from "../../../../common/types/task.types";
import { showMigrationToast } from "../../components/Toasts/MigrationToast/MigrationToast";
import { useTaskActions } from "./useTaskActions";

jest.mock("../../components/Toasts/MigrationToast/MigrationToast", () => ({
  showMigrationToast: jest.fn(),
}));

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
    delete: jest.fn().mockResolvedValue(undefined),
    move: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
  };

  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-10-27T10:00:00Z",
    order: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskRepository.get.mockResolvedValue([]);
    mockTaskRepository.save.mockResolvedValue(undefined);
    mockTaskRepository.move.mockResolvedValue(undefined);
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
      result.current.migrateTask(mockTask.id, "forward");
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
      result.current.migrateTask(mockTask.id, "backward");
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

      mockTaskRepository.get
        .mockResolvedValueOnce([mockTask]) // target date
        .mockResolvedValueOnce([]); // original date

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
        expect(mockTaskRepository.save).toHaveBeenCalledWith("2025-10-27", [
          mockTask,
        ]);
      });

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

      mockTaskRepository.get
        .mockResolvedValueOnce([mockTask]) // target date
        .mockResolvedValueOnce([]); // original date

      act(() => {
        result.current.restoreTask();
      });

      await waitFor(() => {
        expect(mockTaskRepository.save).toHaveBeenCalledWith("2025-10-26", []);
        expect(mockTaskRepository.save).toHaveBeenCalledWith("2025-10-27", [
          mockTask,
        ]);
      });
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
      expect(mockTaskRepository.save).not.toHaveBeenCalled();

      // Should still clear undo state
      expect(mockSetUndoState).toHaveBeenCalledWith(null);
      expect(mockSetUndoToastId).toHaveBeenCalledWith(null);
    });

    it("prioritizes deleted task over migrated task in restoreTask", () => {
      const deletedUndoState = {
        type: "delete" as const,
        task: {
          id: "deleted-task",
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
