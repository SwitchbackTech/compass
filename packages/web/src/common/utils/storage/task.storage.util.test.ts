import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import { IndexedDBAdapter } from "@web/common/storage/adapter/indexeddb.adapter";
import { Task } from "@web/common/types/task.types";
import {
  clearAllTasksFromIndexedDB,
  clearTasksForDateKey,
  deleteTaskFromIndexedDB,
  loadAllTasksFromIndexedDB,
  loadTasksFromIndexedDB,
  moveTaskBetweenDates,
  saveTaskToIndexedDB,
  saveTasksToIndexedDB,
} from "./task.storage.util";

describe("task.storage.util", () => {
  beforeEach(async () => {
    await ensureStorageReady();
    await clearAllTasksFromIndexedDB();
  });

  describe("saveTaskToIndexedDB", () => {
    it("should save a task to IndexedDB with dateKey", async () => {
      const task = createMockTask();
      const dateKey = "2024-01-15";

      await saveTaskToIndexedDB(task, dateKey);

      const allTasks = await getStorageAdapter().getAllTasks();
      const savedTask = allTasks.find((t) => t._id === task._id);
      expect(savedTask).toBeDefined();
      expect(savedTask?._id).toBe(task._id);
      expect(savedTask?.title).toBe(task.title);
      expect(savedTask?.dateKey).toBe(dateKey);
    });

    it("should update an existing task when saving with same id", async () => {
      const task = createMockTask({ title: "Original Title" });
      const dateKey = "2024-01-15";

      await saveTaskToIndexedDB(task, dateKey);

      const updatedTask = { ...task, title: "Updated Title" };
      await saveTaskToIndexedDB(updatedTask, dateKey);

      const allTasks = await getStorageAdapter().getAllTasks();
      const savedTask = allTasks.find((t) => t._id === task._id);
      expect(savedTask?.title).toBe("Updated Title");
    });

    it("should default user when saving a task without user", async () => {
      const task = createMockTask({ user: undefined });
      delete (task as Partial<Task>).user;
      const dateKey = "2024-01-15";

      await saveTaskToIndexedDB(task, dateKey);

      const allTasks = await getStorageAdapter().getAllTasks();
      const savedTask = allTasks.find((t) => t._id === task._id);
      expect(savedTask?.user).toBe(UNAUTHENTICATED_USER);
    });
  });

  describe("saveTasksToIndexedDB", () => {
    it("should save multiple tasks to IndexedDB", async () => {
      const task1 = createMockTask({ title: "Task 1" });
      const task2 = createMockTask({ title: "Task 2" });
      const dateKey = "2024-01-15";

      await saveTasksToIndexedDB(dateKey, [task1, task2]);

      const tasks = await loadTasksFromIndexedDB(dateKey);
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.title)).toContain("Task 1");
      expect(tasks.map((t) => t.title)).toContain("Task 2");
    });

    it("should replace existing tasks for the dateKey", async () => {
      const task1 = createMockTask({ title: "Task 1" });
      const task2 = createMockTask({ title: "Task 2" });
      const dateKey = "2024-01-15";

      await saveTasksToIndexedDB(dateKey, [task1]);
      await saveTasksToIndexedDB(dateKey, [task2]);

      const tasks = await loadTasksFromIndexedDB(dateKey);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Task 2");
    });

    it("should handle empty array", async () => {
      const dateKey = "2024-01-15";
      await saveTasksToIndexedDB(dateKey, []);

      const tasks = await loadTasksFromIndexedDB(dateKey);
      expect(tasks).toHaveLength(0);
    });
  });

  describe("loadTasksFromIndexedDB", () => {
    it("should load tasks for a specific dateKey", async () => {
      const task1 = createMockTask({ title: "Task for Day 1" });
      const task2 = createMockTask({ title: "Task for Day 2" });

      await saveTaskToIndexedDB(task1, "2024-01-15");
      await saveTaskToIndexedDB(task2, "2024-01-16");

      const tasksDay1 = await loadTasksFromIndexedDB("2024-01-15");
      const tasksDay2 = await loadTasksFromIndexedDB("2024-01-16");

      expect(tasksDay1).toHaveLength(1);
      expect(tasksDay1[0].title).toBe("Task for Day 1");
      expect(tasksDay2).toHaveLength(1);
      expect(tasksDay2[0].title).toBe("Task for Day 2");
    });

    it("should return tasks without dateKey property", async () => {
      const task = createMockTask();
      await saveTaskToIndexedDB(task, "2024-01-15");

      const tasks = await loadTasksFromIndexedDB("2024-01-15");

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).not.toHaveProperty("dateKey");
    });

    it("should return empty array when no tasks exist for dateKey", async () => {
      const tasks = await loadTasksFromIndexedDB("2024-01-15");
      expect(tasks).toHaveLength(0);
    });

    it("should normalize legacy tasks without a user", async () => {
      const task = createMockTask();
      delete (task as Partial<Task>).user;

      const adapter = getStorageAdapter() as IndexedDBAdapter;
      await adapter.putRawStoredTaskForTesting({
        ...(task as unknown as Task),
        dateKey: "2024-01-15",
      });

      const tasks = await loadTasksFromIndexedDB("2024-01-15");

      expect(tasks).toHaveLength(1);
      expect(tasks[0].user).toBe(UNAUTHENTICATED_USER);
    });
  });

  describe("deleteTaskFromIndexedDB", () => {
    it("should delete a task by ID", async () => {
      const task = createMockTask();
      await saveTaskToIndexedDB(task, "2024-01-15");

      await deleteTaskFromIndexedDB(task._id);

      const allTasks = await getStorageAdapter().getAllTasks();
      const deletedTask = allTasks.find((t) => t._id === task._id);
      expect(deletedTask).toBeUndefined();
    });

    it("should not throw error when deleting non-existent task", async () => {
      await expect(
        deleteTaskFromIndexedDB("non-existent-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("clearTasksForDateKey", () => {
    it("should clear all tasks for a specific dateKey", async () => {
      const task1 = createMockTask({ title: "Task 1" });
      const task2 = createMockTask({ title: "Task 2" });
      const task3 = createMockTask({ title: "Task 3 - other day" });

      await saveTaskToIndexedDB(task1, "2024-01-15");
      await saveTaskToIndexedDB(task2, "2024-01-15");
      await saveTaskToIndexedDB(task3, "2024-01-16");

      await clearTasksForDateKey("2024-01-15");

      const tasksDay1 = await loadTasksFromIndexedDB("2024-01-15");
      const tasksDay2 = await loadTasksFromIndexedDB("2024-01-16");

      expect(tasksDay1).toHaveLength(0);
      expect(tasksDay2).toHaveLength(1);
    });
  });

  describe("clearAllTasksFromIndexedDB", () => {
    it("should clear all tasks from IndexedDB", async () => {
      const task1 = createMockTask();
      const task2 = createMockTask();

      await saveTaskToIndexedDB(task1, "2024-01-15");
      await saveTaskToIndexedDB(task2, "2024-01-16");

      await clearAllTasksFromIndexedDB();

      const allTasks = await getStorageAdapter().getAllTasks();
      expect(allTasks).toHaveLength(0);
    });
  });

  describe("moveTaskBetweenDates", () => {
    it("should move a task from one date to another", async () => {
      const task = createMockTask({ title: "Moving Task" });
      await saveTaskToIndexedDB(task, "2024-01-15");

      await moveTaskBetweenDates(task, "2024-01-15", "2024-01-16");

      const tasksDay1 = await loadTasksFromIndexedDB("2024-01-15");
      const tasksDay2 = await loadTasksFromIndexedDB("2024-01-16");

      expect(tasksDay1).toHaveLength(0);
      expect(tasksDay2).toHaveLength(1);
      expect(tasksDay2[0].title).toBe("Moving Task");
    });

    it("should update the dateKey on the moved task", async () => {
      const task = createMockTask();
      await saveTaskToIndexedDB(task, "2024-01-15");

      await moveTaskBetweenDates(task, "2024-01-15", "2024-01-16");

      const allTasks = await getStorageAdapter().getAllTasks();
      const savedTask = allTasks.find((t) => t._id === task._id);
      expect(savedTask?.dateKey).toBe("2024-01-16");
    });
  });

  describe("loadAllTasksFromIndexedDB", () => {
    it("should load all tasks from IndexedDB with dateKey", async () => {
      const task1 = createMockTask({ title: "Task 1" });
      const task2 = createMockTask({ title: "Task 2" });

      await saveTaskToIndexedDB(task1, "2024-01-15");
      await saveTaskToIndexedDB(task2, "2024-01-16");

      const allTasks = await loadAllTasksFromIndexedDB();

      expect(allTasks).toHaveLength(2);
      expect(allTasks.map((t) => t.title)).toContain("Task 1");
      expect(allTasks.map((t) => t.title)).toContain("Task 2");
      // Should include dateKey for each task
      expect(allTasks.find((t) => t.title === "Task 1")?.dateKey).toBe(
        "2024-01-15",
      );
      expect(allTasks.find((t) => t.title === "Task 2")?.dateKey).toBe(
        "2024-01-16",
      );
    });

    it("should return empty array when no tasks exist", async () => {
      const allTasks = await loadAllTasksFromIndexedDB();
      expect(allTasks).toHaveLength(0);
    });
  });
});
