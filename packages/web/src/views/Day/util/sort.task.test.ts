import { Task } from "../task.types";
import { sortTasksByStatus } from "./sort.task";

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
});
