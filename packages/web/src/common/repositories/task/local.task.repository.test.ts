import {
  createTestTask,
  createTestTasks,
} from "@web/__tests__/utils/repositories/repository.test.factory";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
import { LocalTaskRepository } from "./local.task.repository";

jest.mock("@web/common/utils/storage/storage.util");

describe("LocalTaskRepository", () => {
  let repository: LocalTaskRepository;
  const mockLoadTasks = loadTasksFromStorage as jest.MockedFunction<
    typeof loadTasksFromStorage
  >;
  const mockSaveTasks = saveTasksToStorage as jest.MockedFunction<
    typeof saveTasksToStorage
  >;

  beforeEach(() => {
    repository = new LocalTaskRepository();
    jest.clearAllMocks();
  });

  describe("get", () => {
    it("should load tasks from storage", () => {
      const dateKey = "2024-01-01";
      const mockTasks = [
        createTestTask({
          id: "task-1",
          title: "Test Task",
        }),
      ];

      mockLoadTasks.mockReturnValue(mockTasks);

      const result = repository.get(dateKey);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockLoadTasks).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTasks);
    });

    it("should return empty array when no tasks exist", () => {
      const dateKey = "2024-01-01";
      mockLoadTasks.mockReturnValue([]);

      const result = repository.get(dateKey);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(result).toEqual([]);
    });
  });

  describe("save", () => {
    it("should save tasks to storage", () => {
      const dateKey = "2024-01-01";
      const tasks = [
        createTestTask({
          id: "task-1",
          title: "Test Task",
        }),
      ];

      repository.save(dateKey, tasks);

      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, tasks);
      expect(mockSaveTasks).toHaveBeenCalledTimes(1);
    });

    it("should save empty array", () => {
      const dateKey = "2024-01-01";
      const tasks: ReturnType<typeof createTestTask>[] = [];

      repository.save(dateKey, tasks);

      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, tasks);
    });
  });

  describe("delete", () => {
    it("should delete a task by id", () => {
      const dateKey = "2024-01-01";
      const tasks = createTestTasks(2, {
        id: undefined, // Let factory generate IDs
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockLoadTasks.mockReturnValue(tasks);

      repository.delete(dateKey, "task-1");

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, [
        expect.objectContaining({ id: "task-2" }),
      ]);
    });

    it("should handle deleting non-existent task", () => {
      const dateKey = "2024-01-01";
      const tasks = [
        createTestTask({
          id: "task-1",
          title: "Task 1",
        }),
      ];

      mockLoadTasks.mockReturnValue(tasks);

      repository.delete(dateKey, "non-existent");

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, tasks);
    });

    it("should handle deleting from empty task list", () => {
      const dateKey = "2024-01-01";
      mockLoadTasks.mockReturnValue([]);

      repository.delete(dateKey, "task-1");

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, []);
    });
  });

  describe("reorder", () => {
    it("should reorder tasks and update order values for todo tasks", () => {
      const dateKey = "2024-01-01";
      const tasks = createTestTasks(3, {
        status: "todo",
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockLoadTasks.mockReturnValue(tasks);

      repository.reorder(dateKey, 0, 2);

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

    it("should update order separately for todo and completed tasks", () => {
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

      mockLoadTasks.mockReturnValue(tasks);

      repository.reorder(dateKey, 0, 1);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalled();
      const savedCall = mockSaveTasks.mock.calls[0];
      const savedTasks = savedCall[1];

      // Todo tasks should have order 0, 1
      const savedTodoTasks = savedTasks.filter((t) => t.status === "todo");
      expect(savedTodoTasks[0].order).toBe(0);
      expect(savedTodoTasks[1].order).toBe(1);

      // Completed tasks should have order 0, 1
      const savedCompletedTasks = savedTasks.filter(
        (t) => t.status === "completed",
      );
      expect(savedCompletedTasks[0].order).toBe(0);
      expect(savedCompletedTasks[1].order).toBe(1);
    });

    it("should handle reordering within completed tasks", () => {
      const dateKey = "2024-01-01";
      const tasks = createTestTasks(2, {
        status: "completed",
      }).map((task, index) => ({
        ...task,
        id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockLoadTasks.mockReturnValue(tasks);

      repository.reorder(dateKey, 0, 1);

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
});
