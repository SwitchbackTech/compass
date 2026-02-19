/**
 * Task storage utilities - compatibility layer.
 *
 * @deprecated These functions delegate to the StorageAdapter.
 * New code should use getStorageAdapter() directly.
 *
 * @see {@link @web/common/storage/adapter}
 */
import {
  StoredTask,
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter";
import { Task, normalizeTask } from "@web/common/types/task.types";
import { handleDatabaseError } from "./db-errors.util";

// Re-export StoredTask for backward compatibility
export type { StoredTask };

/**
 * Saves a single task to IndexedDB with its associated dateKey.
 * @deprecated Use getStorageAdapter().putTasks() instead
 */
export async function saveTaskToIndexedDB(
  task: Task,
  dateKey: string,
): Promise<void> {
  try {
    await ensureStorageReady();
    const adapter = getStorageAdapter();

    // Get existing tasks, add/update this one, save all
    const existingTasks = await adapter.getTasks(dateKey);
    const normalizedTask = normalizeTask(task);
    const taskIndex = existingTasks.findIndex(
      (t) => t._id === normalizedTask._id,
    );

    if (taskIndex >= 0) {
      existingTasks[taskIndex] = normalizedTask;
    } else {
      existingTasks.push(normalizedTask);
    }

    await adapter.putTasks(dateKey, existingTasks);
  } catch (error) {
    handleDatabaseError(error, "save");
  }
}

/**
 * Saves multiple tasks to IndexedDB for a specific dateKey.
 * @deprecated Use getStorageAdapter().putTasks() instead
 */
export async function saveTasksToIndexedDB(
  dateKey: string,
  tasks: Task[],
): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().putTasks(dateKey, tasks);
  } catch (error) {
    handleDatabaseError(error, "save");
  }
}

/**
 * Loads all tasks from IndexedDB for a specific dateKey.
 * @deprecated Use getStorageAdapter().getTasks() instead
 */
export async function loadTasksFromIndexedDB(dateKey: string): Promise<Task[]> {
  try {
    await ensureStorageReady();
    return await getStorageAdapter().getTasks(dateKey);
  } catch (error) {
    handleDatabaseError(error, "load");
  }
}

/**
 * Deletes a task from IndexedDB by its ID.
 * @deprecated Use getStorageAdapter().deleteTask() instead
 */
export async function deleteTaskFromIndexedDB(taskId: string): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().deleteTask(taskId);
  } catch (error) {
    handleDatabaseError(error, "delete");
  }
}

/**
 * Clears all tasks for a specific dateKey from IndexedDB.
 * @deprecated Use getStorageAdapter().putTasks(dateKey, []) instead
 */
export async function clearTasksForDateKey(dateKey: string): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().putTasks(dateKey, []);
  } catch (error) {
    handleDatabaseError(error, "clear");
  }
}

/**
 * Clears all tasks from IndexedDB.
 * @deprecated Use getStorageAdapter().clearAllTasks() instead
 */
export async function clearAllTasksFromIndexedDB(): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().clearAllTasks();
  } catch (error) {
    handleDatabaseError(error, "clear");
  }
}

/**
 * Moves a task from one date to another.
 * @deprecated Use getStorageAdapter().moveTask() instead
 */
export async function moveTaskBetweenDates(
  task: Task,
  fromDateKey: string,
  toDateKey: string,
): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().moveTask(task, fromDateKey, toDateKey);
  } catch (error) {
    handleDatabaseError(error, "move");
  }
}

/**
 * Loads all tasks from IndexedDB.
 * @deprecated Use getStorageAdapter().getAllTasks() instead
 */
export async function loadAllTasksFromIndexedDB(): Promise<StoredTask[]> {
  try {
    await ensureStorageReady();
    return await getStorageAdapter().getAllTasks();
  } catch (error) {
    handleDatabaseError(error, "load");
  }
}
