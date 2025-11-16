import { Task } from "../../types/task.types";
import { getIncompleteTasksSorted, sortTasksByStatus } from "./sort.task";

describe("taskSort.util", () => {
  describe("sortTasksByStatus", () => {
    it("should move completed tasks to end", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Task 2",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
        {
          id: "task-3",
          title: "Task 3",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0].id).toBe("task-1");
      expect(result[1].id).toBe("task-3");
      expect(result[2].id).toBe("task-2");
    });

    it("should maintain order of incomplete tasks", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First todo",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Second todo",
          status: "todo",
          createdAt: "2024-01-01T11:00:00Z",
        },
        {
          id: "task-3",
          title: "Third todo",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0].id).toBe("task-1");
      expect(result[1].id).toBe("task-2");
      expect(result[2].id).toBe("task-3");
    });

    it("should maintain order of completed tasks", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First completed",
          status: "completed",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Second completed",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
        {
          id: "task-3",
          title: "Third completed",
          status: "completed",
          createdAt: "2024-01-01T12:00:00Z",
        },
      ];

      const result = sortTasksByStatus(tasks);

      expect(result[0].id).toBe("task-1");
      expect(result[1].id).toBe("task-2");
      expect(result[2].id).toBe("task-3");
    });

    it("should handle empty array", () => {
      const result = sortTasksByStatus([]);
      expect(result).toEqual([]);
    });

    it("should handle mixed completed and incomplete tasks", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Todo 1",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Completed 1",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
        {
          id: "task-3",
          title: "Todo 2",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
        {
          id: "task-4",
          title: "Completed 2",
          status: "completed",
          createdAt: "2024-01-01T13:00:00Z",
        },
        {
          id: "task-5",
          title: "Todo 3",
          status: "todo",
          createdAt: "2024-01-01T14:00:00Z",
        },
      ];

      const result = sortTasksByStatus(tasks);

      // All todos should come first
      expect(result[0].id).toBe("task-1");
      expect(result[1].id).toBe("task-3");
      expect(result[2].id).toBe("task-5");

      // All completed should come after
      expect(result[3].id).toBe("task-2");
      expect(result[4].id).toBe("task-4");
    });

    it("should not mutate original array", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Task 2",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
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
          id: "task-1",
          title: "Todo 1",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Completed 1",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
        {
          id: "task-3",
          title: "Todo 2",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("task-3");
      expect(result[1].id).toBe("task-1");
      expect(result.every((task) => task.status === "todo")).toBe(true);
    });

    it("should sort by creation date newest first", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Oldest",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Middle",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
        {
          id: "task-3",
          title: "Newest",
          status: "todo",
          createdAt: "2024-01-01T14:00:00Z",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result[0].id).toBe("task-3");
      expect(result[1].id).toBe("task-2");
      expect(result[2].id).toBe("task-1");
    });

    it("should use array index as tie-breaker for identical timestamps", () => {
      const sameTimestamp = "2024-01-01T10:00:00Z";
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First",
          status: "todo",
          createdAt: sameTimestamp,
        },
        {
          id: "task-2",
          title: "Second",
          status: "todo",
          createdAt: sameTimestamp,
        },
        {
          id: "task-3",
          title: "Third",
          status: "todo",
          createdAt: sameTimestamp,
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      // With identical timestamps, newer index (later in original array) comes first
      expect(result[0].id).toBe("task-3");
      expect(result[1].id).toBe("task-2");
      expect(result[2].id).toBe("task-1");
    });

    it("should handle empty array", () => {
      const result = getIncompleteTasksSorted([]);
      expect(result).toEqual([]);
    });

    it("should handle all completed tasks", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Completed 1",
          status: "completed",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Completed 2",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toEqual([]);
    });

    it("should handle all incomplete tasks", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Todo 1",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Todo 2",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
        {
          id: "task-3",
          title: "Todo 3",
          status: "todo",
          createdAt: "2024-01-01T11:00:00Z",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("task-2"); // Newest
      expect(result[1].id).toBe("task-3");
      expect(result[2].id).toBe("task-1"); // Oldest
    });

    it("should not mutate original array", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Task 2",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
      ];

      const originalTasks = [...tasks];
      getIncompleteTasksSorted(tasks);

      expect(tasks).toEqual(originalTasks);
    });

    it("should handle mixed timestamps and statuses correctly", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Old todo",
          status: "todo",
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Completed",
          status: "completed",
          createdAt: "2024-01-01T11:00:00Z",
        },
        {
          id: "task-3",
          title: "New todo",
          status: "todo",
          createdAt: "2024-01-01T14:00:00Z",
        },
        {
          id: "task-4",
          title: "Middle todo",
          status: "todo",
          createdAt: "2024-01-01T12:00:00Z",
        },
      ];

      const result = getIncompleteTasksSorted(tasks);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("task-3"); // Newest
      expect(result[1].id).toBe("task-4");
      expect(result[2].id).toBe("task-1"); // Oldest
    });
  });
});
