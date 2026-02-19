import {
  createTestTask,
  createTestTasks,
} from "@web/__tests__/utils/repositories/repository.test.factory";
import {
  deleteTaskFromIndexedDB,
  loadTasksFromIndexedDB,
  moveTaskBetweenDates,
  saveTasksToIndexedDB,
} from "@web/common/utils/storage/task.storage.util";
import { LocalTaskRepository } from "./local.task.repository";

jest.mock("@web/common/utils/storage/task.storage.util");

describe("LocalTaskRepository", () => {
  let repository: LocalTaskRepository;
  const mockLoadTasks = loadTasksFromIndexedDB as jest.MockedFunction<
    typeof loadTasksFromIndexedDB
  >;
  const mockSaveTasks = saveTasksToIndexedDB as jest.MockedFunction<
    typeof saveTasksToIndexedDB
  >;
  const mockDeleteTask = deleteTaskFromIndexedDB as jest.MockedFunction<
    typeof deleteTaskFromIndexedDB
  >;
  const mockMoveTask = moveTaskBetweenDates as jest.MockedFunction<
    typeof moveTaskBetweenDates
  >;

  beforeEach(() => {
    repository = new LocalTaskRepository();
    jest.clearAllMocks();
    mockLoadTasks.mockResolvedValue([]);
    mockSaveTasks.mockResolvedValue(undefined);
    mockDeleteTask.mockResolvedValue(undefined);
    mockMoveTask.mockResolvedValue(undefined);
  });

  describe("get", () => {
    it("should load tasks from IndexedDB", async () => {
      const dateKey = "2024-01-01";
      const mockTasks = [
        createTestTask({
          id: "task-1",
          title: "Test Task",
        }),
      ];

      mockLoadTasks.mockResolvedValue(mockTasks);

      const result = await repository.get(dateKey);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockLoadTasks).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTasks);
    });

    it("should return empty array when no tasks exist", async () => {
      const dateKey = "2024-01-01";
      mockLoadTasks.mockResolvedValue([]);

      const result = await repository.get(dateKey);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(result).toEqual([]);
    });
  });

  describe("save", () => {
    it("should save tasks to IndexedDB", async () => {
      const dateKey = "2024-01-01";
      const tasks = [
        createTestTask({
          id: "task-1",
          title: "Test Task",
        }),
      ];

      await repository.save(dateKey, tasks);

      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, tasks);
      expect(mockSaveTasks).toHaveBeenCalledTimes(1);
    });

    it("should save empty array", async () => {
      const dateKey = "2024-01-01";
      const tasks: ReturnType<typeof createTestTask>[] = [];

      await repository.save(dateKey, tasks);

      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, tasks);
    });
  });

  describe("delete", () => {
    it("should delete a task by id when it belongs to the date", async () => {
      const dateKey = "2024-01-01";
      mockLoadTasks.mockResolvedValue([
        createTestTask({
          id: "task-1",
        }),
      ]);

      await repository.delete(dateKey, "task-1");

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockDeleteTask).toHaveBeenCalledWith("task-1");
    });

    it("should handle deleting non-existent task", async () => {
      const dateKey = "2024-01-01";
      mockLoadTasks.mockResolvedValue([]);

      await repository.delete(dateKey, "non-existent");

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockDeleteTask).not.toHaveBeenCalled();
    });
  });

  describe("reorder", () => {
    it("should reorder tasks and update order values for todo tasks", async () => {
      const dateKey = "2024-01-01";
      const tasks = createTestTasks(3, {
        status: "todo",
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockLoadTasks.mockResolvedValue(tasks);

      await repository.reorder(dateKey, 0, 2);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalled();
      const savedCall = mockSaveTasks.mock.calls[0];
      expect(savedCall[0]).toBe(dateKey);
      const savedTasks = savedCall[1];

      // Task 2 should now be first
      expect(savedTasks[0].id).toBe("task-2");
      expect(savedTasks[0].order).toBe(0);
      // Task 3 should now be second
      expect(savedTasks[1].id).toBe("task-3");
      expect(savedTasks[1].order).toBe(1);
      // Task 1 should now be third
      expect(savedTasks[2].id).toBe("task-1");
      expect(savedTasks[2].order).toBe(2);
    });

    it("should update order separately for todo and completed tasks", async () => {
      const dateKey = "2024-01-01";
      const todoTasks = createTestTasks(2, {
        status: "todo",
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      const completedTasks = createTestTasks(2, {
        status: "completed",
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 3}`,
        title: `Task ${index + 3}`,
        order: index,
      }));

      const tasks = [...todoTasks, ...completedTasks];

      mockLoadTasks.mockResolvedValue(tasks);

      await repository.reorder(dateKey, 0, 1);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalled();
      const savedCall = mockSaveTasks.mock.calls[0];
      const savedTasks = savedCall[1];

      // Todo tasks should have order 0, 1
      const savedTodoTasks = savedTasks.filter(
        (t: { status: string }) => t.status === "todo",
      );
      expect(savedTodoTasks[0].order).toBe(0);
      expect(savedTodoTasks[1].order).toBe(1);

      // Completed tasks should have order 0, 1
      const savedCompletedTasks = savedTasks.filter(
        (t: { status: string }) => t.status === "completed",
      );
      expect(savedCompletedTasks[0].order).toBe(0);
      expect(savedCompletedTasks[1].order).toBe(1);
    });

    it("should handle reordering within completed tasks", async () => {
      const dateKey = "2024-01-01";
      const tasks = createTestTasks(2, {
        status: "completed",
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockLoadTasks.mockResolvedValue(tasks);

      await repository.reorder(dateKey, 0, 1);

      const savedCall = mockSaveTasks.mock.calls[0];
      const savedTasks = savedCall[1];

      // Task 2 should now be first
      expect(savedTasks[0].id).toBe("task-2");
      expect(savedTasks[0].order).toBe(0);
      // Task 1 should now be second
      expect(savedTasks[1].id).toBe("task-1");
      expect(savedTasks[1].order).toBe(1);
    });
  });

  describe("move", () => {
    it("should move a task between dates", async () => {
      const task = createTestTask({
        id: "task-1",
      });

      await repository.move(task, "2024-01-01", "2024-01-02");

      expect(mockMoveTask).toHaveBeenCalledWith(
        task,
        "2024-01-01",
        "2024-01-02",
      );
      expect(mockMoveTask).toHaveBeenCalledTimes(1);
    });
  });
});
