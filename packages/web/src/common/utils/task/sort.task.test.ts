import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { Task } from "../../types/task.types";
import { getIncompleteTasksSorted, sortTasksByStatus } from "./sort.task";

describe("sort.task", () => {
  describe("sortTasksByStatus", () => {
    it("should move completed tasks to end", () => {
      const task1 = createMockTask({ status: "todo", _id: "task-1", order: 0 });
      const task2 = createMockTask({
        status: "completed",
        _id: "task-2",
        order: 0,
      });
      const task3 = createMockTask({ status: "todo", _id: "task-3", order: 1 });

      const result = sortTasksByStatus([task3, task1, task2]);

      expect(result[0]._id).toBe("task-1");
      expect(result[1]._id).toBe("task-3");
      expect(result[2]._id).toBe("task-2");
    });

    it("should sort incomplete tasks by order", () => {
      const tasks: Task[] = [
        createMockTask({ status: "todo", _id: "task-1", order: 2 }),
        createMockTask({ status: "todo", _id: "task-2", order: 0 }),
        createMockTask({ status: "todo", _id: "task-3", order: 1 }),
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0]._id).toBe("task-2"); // order 0
      expect(result[1]._id).toBe("task-3"); // order 1
      expect(result[2]._id).toBe("task-1"); // order 2
    });

    it("should sort completed tasks by order", () => {
      const tasks: Task[] = [
        createMockTask({ status: "completed", _id: "task-1", order: 2 }),
        createMockTask({ status: "completed", _id: "task-2", order: 0 }),
        createMockTask({ status: "completed", _id: "task-3", order: 1 }),
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0]._id).toBe("task-2"); // order 0
      expect(result[1]._id).toBe("task-3"); // order 1
      expect(result[2]._id).toBe("task-1"); // order 2
    });

    it("should handle empty array", () => {
      const result = sortTasksByStatus([]);
      expect(result).toEqual([]);
    });

    it("should handle mixed completed and incomplete tasks", () => {
      const tasks: Task[] = [
        createMockTask({ status: "todo", _id: "task-1", order: 1 }),
        createMockTask({ status: "completed", _id: "task-2", order: 0 }),
        createMockTask({ status: "todo", _id: "task-3", order: 0 }),
        createMockTask({ status: "completed", _id: "task-4", order: 1 }),
        createMockTask({ status: "todo", _id: "task-5", order: 2 }),
      ];

      const result = sortTasksByStatus(tasks);

      // All todos should come first, sorted by order
      expect(result[0]._id).toBe("task-3"); // todo order 0
      expect(result[1]._id).toBe("task-1"); // todo order 1
      expect(result[2]._id).toBe("task-5"); // todo order 2

      // All completed should come after, sorted by order
      expect(result[3]._id).toBe("task-2"); // completed order 0
      expect(result[4]._id).toBe("task-4"); // completed order 1
    });

    it("should not mutate original array", () => {
      const tasks: Task[] = [
        createMockTask({ status: "todo", _id: "task-1", order: 0 }),
        createMockTask({ status: "completed", _id: "task-2", order: 0 }),
      ];
      const originalTasks = [...tasks];
      sortTasksByStatus(tasks);

      expect(tasks).toEqual(originalTasks);
    });
  });

  describe("getIncompleteTasksSorted", () => {
    it("should filter out completed tasks", () => {
      const tasks: Task[] = [
        createMockTask({ status: "todo", _id: "task-1", order: 0 }),
        createMockTask({ status: "completed", _id: "task-2", order: 0 }),
        createMockTask({ status: "todo", _id: "task-3", order: 0 }),
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe("task-3");
      expect(result[1]._id).toBe("task-1");
      expect(result.every((task) => task.status === "todo")).toBe(true);
    });

    it("should sort by creation date newest first", () => {
      const tasks: Task[] = [
        createMockTask({ _id: "task-1", createdAt: "2024-01-01T10:00:00Z" }),
        createMockTask({ _id: "task-2", createdAt: "2024-01-01T12:00:00Z" }),
        createMockTask({ _id: "task-3", createdAt: "2024-01-01T14:00:00Z" }),
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result[0]._id).toBe("task-3");
      expect(result[1]._id).toBe("task-2");
      expect(result[2]._id).toBe("task-1");
    });

    it("should use array index as tie-breaker for identical timestamps", () => {
      const sameTimestamp = "2024-01-01T10:00:00Z";
      const tasks: Task[] = [
        createMockTask({
          _id: "task-1",
          createdAt: sameTimestamp,
        }),
        createMockTask({
          _id: "task-2",
          createdAt: sameTimestamp,
        }),
        createMockTask({
          _id: "task-3",
          createdAt: sameTimestamp,
        }),
      ];

      const result = getIncompleteTasksSorted(tasks);

      // With identical timestamps, newer index (later in original array) comes first
      expect(result[0]._id).toBe("task-3");
      expect(result[1]._id).toBe("task-2");
      expect(result[2]._id).toBe("task-1");
    });

    it("should handle empty array", () => {
      const result = getIncompleteTasksSorted([]);
      expect(result).toEqual([]);
    });

    it("should handle all completed tasks", () => {
      const tasks: Task[] = [
        createMockTask({
          status: "completed",
          _id: "task-1",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
        }),
        createMockTask({
          status: "completed",
          _id: "task-2",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
        }),
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toEqual([]);
    });

    it("should handle all incomplete tasks", () => {
      const tasks: Task[] = [
        createMockTask({
          status: "todo",
          _id: "task-1",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
        }),
        createMockTask({
          status: "todo",
          _id: "task-2",
          order: 0,
          createdAt: "2024-01-01T12:00:00Z",
        }),
        createMockTask({
          status: "todo",
          _id: "task-3",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
        }),
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe("task-2"); // Newest
      expect(result[1]._id).toBe("task-3");
      expect(result[2]._id).toBe("task-1"); // Oldest
    });

    it("should not mutate original array", () => {
      const tasks: Task[] = [
        createMockTask({
          status: "todo",
          _id: "task-1",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
        }),
        createMockTask({
          status: "completed",
          _id: "task-2",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
        }),
      ];

      const originalTasks = [...tasks];
      getIncompleteTasksSorted(tasks);

      expect(tasks).toEqual(originalTasks);
    });
  });
});
