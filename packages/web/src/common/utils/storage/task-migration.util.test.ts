import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { clearCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { compassLocalDB } from "./compass-local.db";
import { resetDatabaseInitialization } from "./db-init.util";
import {
  hasTaskMigrationCompleted,
  migrateTasksFromLocalStorageToIndexedDB,
  resetTaskMigrationFlag,
} from "./task-migration.util";
import {
  clearAllTasksFromIndexedDB,
  loadAllTasksFromIndexedDB,
  loadTasksFromIndexedDB,
  saveTasksToIndexedDB,
} from "./task.storage.util";

describe("task-migration.util", () => {
  const TASK_STORAGE_KEY_PREFIX = "compass.today.tasks.";
  const MIGRATION_FLAG_KEY = "compass.tasks.migrated-to-indexeddb";
  const COMPASS_LOCAL_DB_NAME = "compass-local";

  async function createLegacySchemaDatabase(
    tasks: Array<Record<string, unknown>> = [],
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(COMPASS_LOCAL_DB_NAME, 2);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("events")) {
          const eventsStore = db.createObjectStore("events", {
            keyPath: "_id",
          });
          eventsStore.createIndex("startDate", "startDate", { unique: false });
          eventsStore.createIndex("endDate", "endDate", { unique: false });
          eventsStore.createIndex("isSomeday", "isSomeday", { unique: false });
        }

        if (!db.objectStoreNames.contains("tasks")) {
          const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
          tasksStore.createIndex("dateKey", "dateKey", { unique: false });
          tasksStore.createIndex("status", "status", { unique: false });
          tasksStore.createIndex("order", "order", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("tasks", "readwrite");
        const tasksStore = transaction.objectStore("tasks");

        tasks.forEach((task) => tasksStore.put(task));

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  beforeEach(async () => {
    // Clear IndexedDB
    await clearAllTasksFromIndexedDB();

    // Clear localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith(TASK_STORAGE_KEY_PREFIX) ||
        key === MIGRATION_FLAG_KEY
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Reset migration flag
    resetTaskMigrationFlag();
  });

  describe("hasTaskMigrationCompleted", () => {
    it("should return false when migration has not been completed", () => {
      expect(hasTaskMigrationCompleted()).toBe(false);
    });

    it("should return true when migration flag is set", () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      expect(hasTaskMigrationCompleted()).toBe(true);
    });
  });

  describe("migrateTasksFromLocalStorageToIndexedDB", () => {
    it("should migrate tasks from localStorage to IndexedDB", async () => {
      const task1 = createMockTask({ title: "Task 1" });
      const task2 = createMockTask({ title: "Task 2" });

      // Store tasks in localStorage
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([task1]),
      );
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-16`,
        JSON.stringify([task2]),
      );

      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();

      expect(migratedCount).toBe(2);

      // Verify tasks are in IndexedDB
      const allTasks = await loadAllTasksFromIndexedDB();
      expect(allTasks).toHaveLength(2);
      expect(allTasks.map((t) => t.title)).toContain("Task 1");
      expect(allTasks.map((t) => t.title)).toContain("Task 2");
    });

    it("should associate tasks with correct dateKey", async () => {
      const task = createMockTask({ title: "Task for specific date" });

      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([task]),
      );

      await migrateTasksFromLocalStorageToIndexedDB();

      const allTasks = await loadAllTasksFromIndexedDB();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].dateKey).toBe("2024-01-15");
    });

    it("should remove localStorage entries after successful migration", async () => {
      const task = createMockTask();
      const storageKey = `${TASK_STORAGE_KEY_PREFIX}2024-01-15`;

      localStorage.setItem(storageKey, JSON.stringify([task]));

      await migrateTasksFromLocalStorageToIndexedDB();

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it("should set migration flag after completion", async () => {
      const task = createMockTask();
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([task]),
      );

      await migrateTasksFromLocalStorageToIndexedDB();

      expect(hasTaskMigrationCompleted()).toBe(true);
    });

    it("should return 0 and skip migration if already completed", async () => {
      const task = createMockTask();
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([task]),
      );

      // First migration
      await migrateTasksFromLocalStorageToIndexedDB();

      // Add another task to localStorage
      const task2 = createMockTask({ title: "New Task" });
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-16`,
        JSON.stringify([task2]),
      );

      // Second migration should be skipped
      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();

      expect(migratedCount).toBe(0);
    });

    it("should handle empty localStorage", async () => {
      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();
      expect(migratedCount).toBe(0);
      expect(hasTaskMigrationCompleted()).toBe(true);
    });

    it("should skip invalid JSON entries", async () => {
      const validTask = createMockTask({ title: "Valid Task" });

      // Valid entry
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([validTask]),
      );
      // Invalid JSON
      localStorage.setItem(`${TASK_STORAGE_KEY_PREFIX}2024-01-16`, "not json");

      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();

      // Should still migrate the valid task
      expect(migratedCount).toBe(1);

      const allTasks = await loadAllTasksFromIndexedDB();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].title).toBe("Valid Task");
    });

    it("should skip non-array entries", async () => {
      const validTask = createMockTask({ title: "Valid Task" });

      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([validTask]),
      );
      // Object instead of array
      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-16`,
        JSON.stringify({ notAnArray: true }),
      );

      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();

      expect(migratedCount).toBe(1);
    });

    it("should skip invalid task objects", async () => {
      const validTask = createMockTask({ title: "Valid Task" });
      const invalidTask = { notATask: true };

      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([validTask, invalidTask]),
      );

      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();

      // Only the valid task should be migrated
      expect(migratedCount).toBe(1);

      const allTasks = await loadAllTasksFromIndexedDB();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].title).toBe("Valid Task");
    });

    it("should migrate legacy tasks with id mapped to _id", async () => {
      const task = createMockTask({
        _id: "legacy-task-id",
        title: "Legacy Task",
      });
      const { _id, ...rest } = task;
      const legacyTask = { ...rest, id: _id };

      localStorage.setItem(
        `${TASK_STORAGE_KEY_PREFIX}2024-01-15`,
        JSON.stringify([legacyTask]),
      );

      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();

      expect(migratedCount).toBe(1);

      const allTasks = await loadAllTasksFromIndexedDB();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0]._id).toBe("legacy-task-id");
      expect(allTasks[0].title).toBe("Legacy Task");
    });

    it("should migrate legacy IndexedDB schema and allow saving new tasks", async () => {
      const legacyTask = {
        id: "legacy-task-id",
        title: "Legacy Task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
        user: "user-1",
        dateKey: "2024-01-15",
      };

      compassLocalDB.close();
      resetDatabaseInitialization();
      await clearCompassLocalDb();
      await createLegacySchemaDatabase([legacyTask]);

      localStorage.setItem(MIGRATION_FLAG_KEY, "true");

      const migratedCount = await migrateTasksFromLocalStorageToIndexedDB();
      expect(migratedCount).toBe(0);

      const restoredLegacyTasks = await loadTasksFromIndexedDB("2024-01-15");
      expect(restoredLegacyTasks).toHaveLength(1);
      expect(restoredLegacyTasks[0]._id).toBe("legacy-task-id");

      const newTask = createMockTask({
        _id: "new-task-id",
        title: "New Task",
      });
      await saveTasksToIndexedDB("2024-01-16", [newTask]);

      const persistedNewTasks = await loadTasksFromIndexedDB("2024-01-16");
      expect(persistedNewTasks).toHaveLength(1);
      expect(persistedNewTasks[0]._id).toBe("new-task-id");
      expect(persistedNewTasks[0].title).toBe("New Task");
    });
  });

  describe("resetTaskMigrationFlag", () => {
    it("should remove the migration flag", () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      expect(hasTaskMigrationCompleted()).toBe(true);

      resetTaskMigrationFlag();

      expect(hasTaskMigrationCompleted()).toBe(false);
    });
  });
});
