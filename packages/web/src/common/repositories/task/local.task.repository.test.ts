import {
  createTestTask,
  createTestTasks,
} from "@web/__tests__/utils/repositories/repository.test.factory";
import { getUserId } from "@web/auth/auth.util";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import * as storageAdapter from "@web/common/storage/adapter/adapter";
import { LocalTaskRepository } from "./local.task.repository";

// Mock the storage adapter module
jest.mock("@web/common/storage/adapter/adapter");
jest.mock("@web/auth/auth.util");

describe("LocalTaskRepository", () => {
  let repository: LocalTaskRepository;
  let mockGetUserId: jest.MockedFunction<typeof getUserId>;
  let mockAdapter: {
    getTasks: jest.Mock;
    putTasks: jest.Mock;
    putTask: jest.Mock;
    deleteTask: jest.Mock;
    moveTask: jest.Mock;
  };

  beforeEach(() => {
    mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
    mockAdapter = {
      getTasks: jest.fn().mockResolvedValue([]),
      putTasks: jest.fn().mockResolvedValue(undefined),
      putTask: jest.fn().mockResolvedValue(undefined),
      deleteTask: jest.fn().mockResolvedValue(undefined),
      moveTask: jest.fn().mockResolvedValue(undefined),
    };

    (storageAdapter.getStorageAdapter as jest.Mock).mockReturnValue(
      mockAdapter,
    );

    repository = new LocalTaskRepository();
    jest.clearAllMocks();
    mockGetUserId.mockResolvedValue(UNAUTHENTICATED_USER);

    // Re-mock after clearing
    (storageAdapter.getStorageAdapter as jest.Mock).mockReturnValue(
      mockAdapter,
    );
  });

  describe("get", () => {
    it("should load tasks from adapter", async () => {
      const dateKey = "2024-01-01";
      const mockTasks = [
        createTestTask({
          _id: "task-1",
          title: "Test Task",
        }),
      ];

      mockAdapter.getTasks.mockResolvedValue(mockTasks);

      const result = await repository.get(dateKey);

      expect(mockAdapter.getTasks).toHaveBeenCalledWith(dateKey);
      expect(mockAdapter.getTasks).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTasks);
    });

    it("should return empty array when no tasks exist", async () => {
      const dateKey = "2024-01-01";
      mockAdapter.getTasks.mockResolvedValue([]);

      const result = await repository.get(dateKey);

      expect(mockAdapter.getTasks).toHaveBeenCalledWith(dateKey);
      expect(result).toEqual([]);
    });
  });

  describe("save", () => {
    it("should save tasks to adapter", async () => {
      const dateKey = "2024-01-01";
      const tasks = [
        createTestTask({
          _id: "task-1",
          title: "Test Task",
        }),
      ];

      await repository.save(dateKey, tasks);

      expect(mockAdapter.putTasks).toHaveBeenCalledWith(dateKey, tasks);
      expect(mockAdapter.putTasks).toHaveBeenCalledTimes(1);
    });

    it("should save empty array", async () => {
      const dateKey = "2024-01-01";
      const tasks: ReturnType<typeof createTestTask>[] = [];

      await repository.save(dateKey, tasks);

      expect(mockAdapter.putTasks).toHaveBeenCalledWith(dateKey, tasks);
    });

    it("should save single task using putTask", async () => {
      const dateKey = "2024-01-01";
      const task = createTestTask({
        _id: "task-1",
        title: "Single Task",
      });

      await repository.save(dateKey, task);

      expect(mockAdapter.putTask).toHaveBeenCalledWith(dateKey, task);
      expect(mockAdapter.putTask).toHaveBeenCalledTimes(1);
      expect(mockAdapter.putTasks).not.toHaveBeenCalled();
    });

    it("rewrites placeholder task users when authenticated", async () => {
      const dateKey = "2024-01-01";
      mockGetUserId.mockResolvedValue("mongo-user-id");
      const tasks = [
        createTestTask({
          _id: "task-1",
          title: "Task One",
          user: UNAUTHENTICATED_USER,
        }),
      ];

      await repository.save(dateKey, tasks);

      expect(mockAdapter.putTasks).toHaveBeenCalledWith(
        dateKey,
        expect.arrayContaining([
          expect.objectContaining({
            _id: "task-1",
            user: "mongo-user-id",
          }),
        ]),
      );
    });

    it("does not rewrite non-placeholder task users", async () => {
      const dateKey = "2024-01-01";
      mockGetUserId.mockResolvedValue("mongo-user-id");
      const task = createTestTask({
        _id: "task-1",
        title: "Task One",
        user: "already-authenticated-user",
      });

      await repository.save(dateKey, task);

      expect(mockAdapter.putTask).toHaveBeenCalledWith(
        dateKey,
        expect.objectContaining({
          _id: "task-1",
          user: "already-authenticated-user",
        }),
      );
    });

    it("keeps placeholder task users when unauthenticated", async () => {
      const dateKey = "2024-01-01";
      mockGetUserId.mockResolvedValue(UNAUTHENTICATED_USER);
      const task = createTestTask({
        _id: "task-1",
        title: "Task One",
        user: UNAUTHENTICATED_USER,
      });

      await repository.save(dateKey, task);

      expect(mockAdapter.putTask).toHaveBeenCalledWith(
        dateKey,
        expect.objectContaining({
          _id: "task-1",
          user: UNAUTHENTICATED_USER,
        }),
      );
    });
  });

  describe("delete", () => {
    it("should delete a task by id when it belongs to the date", async () => {
      const dateKey = "2024-01-01";
      mockAdapter.getTasks.mockResolvedValue([
        createTestTask({
          _id: "task-1",
        }),
      ]);

      await repository.delete(dateKey, "task-1");

      expect(mockAdapter.getTasks).toHaveBeenCalledWith(dateKey);
      expect(mockAdapter.deleteTask).toHaveBeenCalledWith("task-1");
    });

    it("should handle deleting non-existent task", async () => {
      const dateKey = "2024-01-01";
      mockAdapter.getTasks.mockResolvedValue([]);

      await repository.delete(dateKey, "non-existent");

      expect(mockAdapter.getTasks).toHaveBeenCalledWith(dateKey);
      expect(mockAdapter.deleteTask).not.toHaveBeenCalled();
    });
  });

  describe("reorder", () => {
    it("should reorder tasks and update order values for todo tasks", async () => {
      const dateKey = "2024-01-01";
      const tasks = createTestTasks(3, {
        status: "todo",
      }).map((task, index) => ({
        ...task,
        _id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockAdapter.getTasks.mockResolvedValue(tasks);

      await repository.reorder(dateKey, 0, 2);

      expect(mockAdapter.getTasks).toHaveBeenCalledWith(dateKey);
      expect(mockAdapter.putTasks).toHaveBeenCalled();
      const savedCall = mockAdapter.putTasks.mock.calls[0];
      expect(savedCall[0]).toBe(dateKey);
      const savedTasks = savedCall[1];

      // Task 2 should now be first
      expect(savedTasks[0]._id).toBe("task-2");
      expect(savedTasks[0].order).toBe(0);
      // Task 3 should now be second
      expect(savedTasks[1]._id).toBe("task-3");
      expect(savedTasks[1].order).toBe(1);
      // Task 1 should now be third
      expect(savedTasks[2]._id).toBe("task-1");
      expect(savedTasks[2].order).toBe(2);
    });

    it("should update order separately for todo and completed tasks", async () => {
      const dateKey = "2024-01-01";
      const todoTasks = createTestTasks(2, {
        status: "todo",
      }).map((task, index) => ({
        ...task,
        _id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      const completedTasks = createTestTasks(2, {
        status: "completed",
      }).map((task, index) => ({
        ...task,
        _id: `task-${index + 3}`,
        title: `Task ${index + 3}`,
        order: index,
      }));

      const tasks = [...todoTasks, ...completedTasks];

      mockAdapter.getTasks.mockResolvedValue(tasks);

      await repository.reorder(dateKey, 0, 1);

      expect(mockAdapter.getTasks).toHaveBeenCalledWith(dateKey);
      expect(mockAdapter.putTasks).toHaveBeenCalled();
      const savedCall = mockAdapter.putTasks.mock.calls[0];
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
        _id: `task-${index + 1}`,
        title: `Task ${index + 1}`,
        order: index,
      }));

      mockAdapter.getTasks.mockResolvedValue(tasks);

      await repository.reorder(dateKey, 0, 1);

      const savedCall = mockAdapter.putTasks.mock.calls[0];
      const savedTasks = savedCall[1];

      // Task 2 should now be first
      expect(savedTasks[0]._id).toBe("task-2");
      expect(savedTasks[0].order).toBe(0);
      // Task 1 should now be second
      expect(savedTasks[1]._id).toBe("task-1");
      expect(savedTasks[1].order).toBe(1);
    });

    it("should no-op when source index is out of bounds", async () => {
      const dateKey = "2024-01-01";
      mockAdapter.getTasks.mockResolvedValue([
        createTestTask({ _id: "task-1", status: "todo", order: 0 }),
      ]);

      await repository.reorder(dateKey, 5, 0);

      expect(mockAdapter.putTasks).not.toHaveBeenCalled();
    });

    it("should no-op when source and destination indexes are equal", async () => {
      const dateKey = "2024-01-01";
      mockAdapter.getTasks.mockResolvedValue([
        createTestTask({ _id: "task-1", status: "todo", order: 0 }),
        createTestTask({ _id: "task-2", status: "todo", order: 1 }),
      ]);

      await repository.reorder(dateKey, 1, 1);

      expect(mockAdapter.putTasks).not.toHaveBeenCalled();
    });
  });

  describe("move", () => {
    it("should move a task between dates", async () => {
      const task = createTestTask({
        _id: "task-1",
      });

      await repository.move(task, "2024-01-01", "2024-01-02");

      expect(mockAdapter.moveTask).toHaveBeenCalledWith(
        task,
        "2024-01-01",
        "2024-01-02",
      );
      expect(mockAdapter.moveTask).toHaveBeenCalledTimes(1);
    });
  });
});
