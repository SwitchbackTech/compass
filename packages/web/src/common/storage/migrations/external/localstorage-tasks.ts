import { Task, isTask } from "@web/common/types/task.types";
import { StorageAdapter } from "../../adapter/storage.adapter";
import { ExternalMigration } from "../migration.types";

const TASK_KEY_PREFIX = "compass.today.tasks.";

/**
 * Normalize a task, handling legacy format with 'id' instead of '_id'.
 */
function normalizeTaskWithLegacyId(item: unknown): Task | null {
  // Already valid task
  if (isTask(item)) {
    return item;
  }

  // Check if it's an object we can work with
  if (!item || typeof item !== "object") {
    return null;
  }

  // Check for legacy 'id' field
  const legacy = item as Record<string, unknown>;
  if (typeof legacy.id !== "string") {
    return null;
  }

  // Map 'id' to '_id'
  const { id, ...rest } = legacy;
  const mapped = { ...rest, _id: id };

  return isTask(mapped) ? mapped : null;
}

/**
 * Get all localStorage keys that contain task data.
 */
function getTaskStorageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(TASK_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Migration to import tasks from localStorage to the storage adapter.
 *
 * This handles the transition from the original localStorage-based task
 * storage to IndexedDB. It:
 *
 * 1. Finds all task entries in localStorage (compass.today.tasks.YYYY-MM-DD)
 * 2. Parses and validates each task (including legacy 'id' → '_id' mapping)
 * 3. Saves valid tasks to the storage adapter
 * 4. Removes successfully migrated entries from localStorage
 *
 * Partial failures are handled gracefully - only successfully migrated
 * entries are removed from localStorage, allowing retry on next startup.
 */
export const localStorageTasksMigration: ExternalMigration = {
  id: "localstorage-tasks-v1",
  description: "Migrate tasks from localStorage to storage adapter",

  async migrate(adapter: StorageAdapter): Promise<void> {
    // Skip when localStorage is unavailable
    if (typeof localStorage === "undefined") {
      return;
    }

    const keys = getTaskStorageKeys();
    if (keys.length === 0) {
      return;
    }

    const keysToRemove: string[] = [];
    let totalMigrated = 0;

    for (const key of keys) {
      const dateKey = key.replace(TASK_KEY_PREFIX, "");
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          continue;
        }

        const tasks = parsed
          .map(normalizeTaskWithLegacyId)
          .filter((t): t is Task => t !== null);

        if (tasks.length > 0) {
          // Get existing tasks for this date to merge
          const existingTasks = await adapter.getTasks(dateKey);
          const existingIds = new Set(existingTasks.map((t) => t._id));

          // Only add tasks that don't already exist
          const newTasks = tasks.filter((t) => !existingIds.has(t._id));

          if (newTasks.length > 0) {
            await adapter.putTasks(dateKey, [...existingTasks, ...newTasks]);
            totalMigrated += newTasks.length;
          }
        }

        keysToRemove.push(key);
      } catch {
        // Skip invalid entries - don't remove from localStorage for retry
        console.warn(`[Migration] Failed to parse tasks from: ${key}`);
      }
    }

    // Remove successfully migrated entries from localStorage
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    if (totalMigrated > 0) {
      console.log(
        `[Migration] Migrated ${totalMigrated} tasks from localStorage`,
      );
    }
  },

  isComplete(): boolean {
    if (typeof localStorage === "undefined") {
      return true;
    }

    return getTaskStorageKeys().length === 0;
  },
};
