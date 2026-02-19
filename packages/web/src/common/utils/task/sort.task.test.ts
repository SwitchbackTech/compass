import { Task } from "../../types/task.types";
import { getIncompleteTasksSorted, sortTasksByStatus } from "./sort.task";

describe("taskSort.util", () => {
  describe("sortTasksByStatus", () => {
    it("should move completed tasks to end", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "Task 1",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Task 2",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Task 3",
          status: "todo",
          order: 1,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0]._id).toBe("task-1");
      expect(result[1]._id).toBe("task-3");
      expect(result[2]._id).toBe("task-2");
    });

    it("should sort incomplete tasks by order", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "First todo",
          status: "todo",
          order: 2,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Second todo",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Third todo",
          status: "todo",
          order: 1,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0]._id).toBe("task-2"); // order 0
      expect(result[1]._id).toBe("task-3"); // order 1
      expect(result[2]._id).toBe("task-1"); // order 2
    });

    it("should sort completed tasks by order", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "First completed",
          status: "completed",
          order: 2,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Second completed",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Third completed",
          status: "completed",
          order: 1,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
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
        {
          _id: "task-1",
          title: "Todo 1",
          status: "todo",
          order: 1,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Completed 1",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Todo 2",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-4",
          title: "Completed 2",
          status: "completed",
          order: 1,
          createdAt: "2024-01-01T13:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-5",
          title: "Todo 3",
          status: "todo",
          order: 2,
          createdAt: "2024-01-01T14:00:00Z",
          user: "user-1",
        },
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
        {
          _id: "task-1",
          title: "Task 1",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Task 2",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
      ];

      const originalTasks = [...tasks];
      sortTasksByStatus(tasks);

      expect(tasks).toEqual(originalTasks);
    });
  });

  describe("getIncompleteTasksSorted", () => {
    it("should filter out completed tasks", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "Todo 1",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Completed 1",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Todo 2",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe("task-3");
      expect(result[1]._id).toBe("task-1");
      expect(result.every((task) => task.status === "todo")).toBe(true);
    });

    it("should sort by creation date newest first", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "Oldest",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Middle",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Newest",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T14:00:00Z",
          user: "user-1",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result[0]._id).toBe("task-3");
      expect(result[1]._id).toBe("task-2");
      expect(result[2]._id).toBe("task-1");
    });

    it("should use array index as tie-breaker for identical timestamps", () => {
      const sameTimestamp = "2024-01-01T10:00:00Z";
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "First",
          status: "todo",
          order: 0,
          createdAt: sameTimestamp,
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Second",
          status: "todo",
          order: 0,
          createdAt: sameTimestamp,
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Third",
          status: "todo",
          order: 0,
          createdAt: sameTimestamp,
          user: "user-1",
        },
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
        {
          _id: "task-1",
          title: "Completed 1",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Completed 2",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toEqual([]);
    });

    it("should handle all incomplete tasks", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "Todo 1",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Todo 2",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "Todo 3",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe("task-2"); // Newest
      expect(result[1]._id).toBe("task-3");
      expect(result[2]._id).toBe("task-1"); // Oldest
    });

    it("should not mutate original array", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "Task 1",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Task 2",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
      ];

      const originalTasks = [...tasks];
      getIncompleteTasksSorted(tasks);

      expect(tasks).toEqual(originalTasks);
    });

    it("should handle mixed timestamps and statuses correctly", () => {
      const tasks: Task[] = [
        {
          _id: "task-1",
          title: "Old todo",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T10:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-2",
          title: "Completed",
          status: "completed",
          order: 0,
          createdAt: "2024-01-01T11:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-3",
          title: "New todo",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T14:00:00Z",
          user: "user-1",
        },
        {
          _id: "task-4",
          title: "Middle todo",
          status: "todo",
          order: 0,
          createdAt: "2024-01-01T12:00:00Z",
          user: "user-1",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe("task-3"); // Newest
      expect(result[1]._id).toBe("task-4");
      expect(result[2]._id).toBe("task-1"); // Oldest
    });
  });
});
