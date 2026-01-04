import { Task } from "@web/common/types/task.types";
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
      const mockTasks: Task[] = [
        {
          id: "task-1",
          title: "Test Task",
          status: "todo",
          order: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      mockLoadTasks.mockReturnValue(mockTasks);

      const result = repository.get(dateKey);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(result).toEqual(mockTasks);
    });
  });

  describe("save", () => {
    it("should save tasks to storage", () => {
      const dateKey = "2024-01-01";
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Test Task",
          status: "todo",
          order: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      repository.save(dateKey, tasks);

      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, tasks);
    });
  });

  describe("delete", () => {
    it("should delete a task by id", () => {
      const dateKey = "2024-01-01";
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo",
          order: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-2",
          title: "Task 2",
          status: "todo",
          order: 1,
          createdAt: new Date().toISOString(),
        },
      ];

      mockLoadTasks.mockReturnValue(tasks);

      repository.delete(dateKey, "task-1");

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalledWith(dateKey, [
        expect.objectContaining({ id: "task-2" }),
      ]);
    });
  });

  describe("reorder", () => {
    it("should reorder tasks and update order values", () => {
      const dateKey = "2024-01-01";
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo",
          order: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-2",
          title: "Task 2",
          status: "todo",
          order: 1,
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-3",
          title: "Task 3",
          status: "completed",
          order: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      mockLoadTasks.mockReturnValue(tasks);

      repository.reorder(dateKey, 0, 1);

      expect(mockLoadTasks).toHaveBeenCalledWith(dateKey);
      expect(mockSaveTasks).toHaveBeenCalled();
      const savedCall = mockSaveTasks.mock.calls[0];
      expect(savedCall[0]).toBe(dateKey);
      const savedTasks = savedCall[1] as Task[];

      // Task 2 should now be first
      expect(savedTasks[0].id).toBe("task-2");
      expect(savedTasks[0].order).toBe(0);
      // Task 1 should now be second
      expect(savedTasks[1].id).toBe("task-1");
      expect(savedTasks[1].order).toBe(1);
      // Completed task order should be updated separately
      const completedTasks = savedTasks.filter((t) => t.status === "completed");
      expect(completedTasks[0].order).toBe(0);
    });
  });
});
