import { Task, isTask } from "@web/common/types/task.types";
import { ensureDatabaseReady } from "./db-init.util";
import { saveTaskToIndexedDB } from "./task.storage.util";

const MIGRATION_FLAG_KEY = "compass.tasks.migrated-to-indexeddb";
const TASK_STORAGE_KEY_PREFIX = "compass.today.tasks.";

function normalizeLegacyTask(item: unknown): Task | null {
  if (isTask(item)) {
    return item;
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const legacyTask = item as Record<string, unknown> & { id?: unknown };
  if (typeof legacyTask.id !== "string") {
    return null;
  }

  const { id, ...rest } = legacyTask;
  const mappedTask = {
    ...rest,
    _id: id,
  };

  return isTask(mappedTask) ? mappedTask : null;
}

/**
 * Checks if task migration from localStorage to IndexedDB has been completed.
 */
export function hasTaskMigrationCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MIGRATION_FLAG_KEY) === "true";
}

/**
 * Marks task migration as completed.
 */
function markMigrationCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MIGRATION_FLAG_KEY, "true");
}

/**
 * Migrates all tasks from localStorage to IndexedDB.
 *
 * This is a one-time migration that:
 * 1. Finds all task entries in localStorage (compass.today.tasks.YYYY-MM-DD)
 * 2. Parses and validates each task
 * 3. Saves valid tasks to IndexedDB
 * 4. Removes the localStorage entries
 * 5. Sets a flag to prevent re-migration
 *
 * @returns The number of tasks migrated
 */
export async function migrateTasksFromLocalStorageToIndexedDB(): Promise<number> {
  // Skip if running on server or already migrated
  if (typeof window === "undefined") return 0;
  if (hasTaskMigrationCompleted()) return 0;

  try {
    await ensureDatabaseReady();

    let migratedCount = 0;
    let hasSaveFailures = false;
    const keysToRemove: string[] = [];

    // Collect all task keys first (avoid modifying localStorage while iterating)
    const taskKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TASK_STORAGE_KEY_PREFIX)) {
        taskKeys.push(key);
      }
    }

    // Process each task key
    for (const key of taskKeys) {
      const dateKey = key.replace(TASK_STORAGE_KEY_PREFIX, "");
      const rawValue = localStorage.getItem(key);

      if (!rawValue) continue;

      try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) continue;

        // Validate and save each task. If any save fails, keep only failed tasks
        // in localStorage so successful migrations are not duplicated on retry.
        const remainingTasks: Task[] = [];
        for (const item of parsed) {
          const normalizedTask = normalizeLegacyTask(item);

          if (normalizedTask) {
            try {
              await saveTaskToIndexedDB(normalizedTask, dateKey);
              migratedCount++;
            } catch (saveError) {
              hasSaveFailures = true;
              remainingTasks.push(normalizedTask);
              console.error(
                `Failed to save task to IndexedDB for dateKey: ${dateKey}`,
                saveError,
              );
            }
          }
        }

        if (remainingTasks.length === 0) {
          // Mark key for removal after successful migration
          keysToRemove.push(key);
        } else {
          localStorage.setItem(key, JSON.stringify(remainingTasks));
        }
      } catch (parseError) {
        // Skip invalid entries, don't fail the whole migration
        console.warn(
          `Failed to parse tasks from localStorage key: ${key}`,
          parseError,
        );
      }
    }

    // Remove migrated entries from localStorage
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    // Mark migration as complete only when all saves succeeded.
    if (!hasSaveFailures) {
      markMigrationCompleted();
    }

    if (migratedCount > 0) {
      console.log(
        `Migrated ${migratedCount} tasks from localStorage to IndexedDB`,
      );
    }

    return migratedCount;
  } catch (error) {
    console.error("Failed to migrate tasks to IndexedDB:", error);
    // Don't mark as completed on error, so we can retry
    return 0;
  }
}

/**
 * Resets the migration flag. Used for testing.
 */
export function resetTaskMigrationFlag(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_FLAG_KEY);
}
