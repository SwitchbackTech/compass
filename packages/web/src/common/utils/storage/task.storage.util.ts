import {
  Task,
  normalizeTask,
  normalizeTasks,
} from "@web/common/types/task.types";
import { StoredTask, compassLocalDB } from "./compass-local.db";
import { handleDatabaseError } from "./db-errors.util";
import { ensureDatabaseReady } from "./db-init.util";

/**
 * Saves a single task to IndexedDB with its associated dateKey.
 * Uses put() to handle both new and existing tasks.
 */
export async function saveTaskToIndexedDB(
  task: Task,
  dateKey: string,
): Promise<void> {
  const normalizedTask = normalizeTask(task);

  try {
    await ensureDatabaseReady();
    const storedTask: StoredTask = { ...normalizedTask, dateKey };
    await compassLocalDB.tasks.put(storedTask);
  } catch (error) {
    handleDatabaseError(error, "save");
  }
}

/**
 * Saves multiple tasks to IndexedDB for a specific dateKey.
 * Replaces all existing tasks for that dateKey.
 */
export async function saveTasksToIndexedDB(
  dateKey: string,
  tasks: Task[],
): Promise<void> {
  try {
    await ensureDatabaseReady();

    const storedTasks: StoredTask[] = normalizeTasks(tasks).map((task) => ({
      ...task,
      dateKey,
    }));

    await compassLocalDB.transaction("rw", compassLocalDB.tasks, async () => {
      // Replace all tasks for this date atomically
      await compassLocalDB.tasks.where("dateKey").equals(dateKey).delete();

      if (storedTasks.length > 0) {
        await compassLocalDB.tasks.bulkPut(storedTasks);
      }
    });
  } catch (error) {
    handleDatabaseError(error, "save");
  }
}

/**
 * Loads all tasks from IndexedDB for a specific dateKey.
 */
export async function loadTasksFromIndexedDB(dateKey: string): Promise<Task[]> {
  try {
    await ensureDatabaseReady();

    const storedTasks = await compassLocalDB.tasks
      .where("dateKey")
      .equals(dateKey)
      .toArray();

    // Remove dateKey and normalize legacy records (e.g. missing user).
    return storedTasks.map(({ dateKey: _, ...task }) => normalizeTask(task));
  } catch (error) {
    handleDatabaseError(error, "load");
    return [];
  }
}

/**
 * Deletes a task from IndexedDB by its ID.
 */
export async function deleteTaskFromIndexedDB(taskId: string): Promise<void> {
  try {
    await ensureDatabaseReady();
    await compassLocalDB.tasks.delete(taskId);
  } catch (error) {
    handleDatabaseError(error, "delete");
  }
}

/**
 * Clears all tasks for a specific dateKey from IndexedDB.
 */
export async function clearTasksForDateKey(dateKey: string): Promise<void> {
  try {
    await ensureDatabaseReady();
    await compassLocalDB.tasks.where("dateKey").equals(dateKey).delete();
  } catch (error) {
    handleDatabaseError(error, "clear");
  }
}

/**
 * Clears all tasks from IndexedDB. Used for cleanup or testing.
 */
export async function clearAllTasksFromIndexedDB(): Promise<void> {
  try {
    await ensureDatabaseReady();
    await compassLocalDB.tasks.clear();
  } catch (error) {
    handleDatabaseError(error, "clear");
  }
}

/**
 * Moves a task from one date to another.
 */
export async function moveTaskBetweenDates(
  task: Task,
  fromDateKey: string,
  toDateKey: string,
): Promise<void> {
  try {
    await ensureDatabaseReady();
    const normalizedTask = normalizeTask(task);

    await compassLocalDB.transaction("rw", compassLocalDB.tasks, async () => {
      const existingTask = await compassLocalDB.tasks.get(normalizedTask._id);

      // If the task exists for a different date, don't move it.
      if (existingTask && existingTask.dateKey !== fromDateKey) {
        return;
      }

      // Remove from source date (task id stays the same)
      await compassLocalDB.tasks.delete(normalizedTask._id);

      // Add to target date
      const storedTask: StoredTask = { ...normalizedTask, dateKey: toDateKey };
      await compassLocalDB.tasks.put(storedTask);
    });
  } catch (error) {
    handleDatabaseError(error, "move");
  }
}

/**
 * Loads all tasks from IndexedDB. Used for migration or bulk operations.
 */
export async function loadAllTasksFromIndexedDB(): Promise<StoredTask[]> {
  try {
    await ensureDatabaseReady();
    return await compassLocalDB.tasks.toArray();
  } catch (error) {
    handleDatabaseError(error, "load");
    return [];
  }
}
