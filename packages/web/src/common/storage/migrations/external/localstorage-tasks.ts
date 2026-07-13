import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { isTask, type Task } from "@web/common/types/task.types";
import { type OfflineDataStore } from "../../offline-data/offline-data.store";
import { type ExternalMigration } from "../migration.types";

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
  return persistentBrowserStore
    .keys()
    .filter((key) => key.startsWith(TASK_KEY_PREFIX));
}

/**
 * Migration to import tasks from localStorage to the offline data store.
 *
 * This handles the transition from the original localStorage-based task
 * storage to IndexedDB. It:
 *
 * 1. Finds all task entries in localStorage (compass.today.tasks.YYYY-MM-DD)
 * 2. Parses and validates each task (including legacy 'id' → '_id' mapping)
 * 3. Saves valid tasks to the offline data store
 * 4. Removes successfully migrated entries from localStorage
 *
 * Partial failures are handled gracefully - only successfully migrated
 * entries are removed from localStorage, allowing retry on next startup.
 */
export const localStorageTasksMigration: ExternalMigration = {
  id: "localstorage-tasks-v1",
  description: "Migrate tasks from localStorage to offline data store",

  async migrate(store: OfflineDataStore): Promise<void> {
    // Skip when localStorage is unavailable
    if (!persistentBrowserStore.isAvailable()) {
      return;
    }

    const keys = getTaskStorageKeys();
    if (keys.length === 0) {
      return;
    }

    const keysToRemove: string[] = [];

    for (const key of keys) {
      const dateKey = key.replace(TASK_KEY_PREFIX, "");
      const raw = persistentBrowserStore.get(key);

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
          const existingTasks = await store.getTasks(dateKey);
          const existingIds = new Set(existingTasks.map((t) => t._id));

          // Only add tasks that don't already exist
          const newTasks = tasks.filter((t) => !existingIds.has(t._id));

          if (newTasks.length > 0) {
            await store.putTasks(dateKey, [...existingTasks, ...newTasks]);
          }
        }

        keysToRemove.push(key);
      } catch {
        // Skip invalid entries - don't remove from localStorage for retry
        console.error(`[Migration] Failed to parse tasks from: ${key}`);
      }
    }

    // Remove successfully migrated entries from localStorage
    for (const key of keysToRemove) {
      persistentBrowserStore.remove(key);
    }
  },

  isComplete(): boolean {
    if (!persistentBrowserStore.isAvailable()) {
      return true;
    }

    return getTaskStorageKeys().length === 0;
  },
};
