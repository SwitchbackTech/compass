import { Event_Core } from "@core/types/event.types";
import { Task, isTask, normalizeTask } from "@web/common/types/task.types";
import { StoredTask, compassLocalDB } from "./compass-local.db";
import {
  ensureDatabaseReady,
  resetDatabaseInitialization,
} from "./db-init.util";
import { saveTaskToIndexedDB } from "./task.storage.util";

const MIGRATION_FLAG_KEY = "compass.tasks.migrated-to-indexeddb";
const TASK_STORAGE_KEY_PREFIX = "compass.today.tasks.";
const COMPASS_LOCAL_DB_NAME = "compass-local";
const EVENTS_STORE_NAME = "events";
const TASKS_STORE_NAME = "tasks";

interface LegacyDbSnapshot {
  events: Event_Core[];
  tasks: unknown[];
}

function normalizeTaskWithLegacyId(item: unknown): Task | null {
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

function requestAsPromise<T>(
  request: IDBRequest<T>,
  blockedErrorMessage?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    if (blockedErrorMessage && "onblocked" in request) {
      (request as IDBOpenDBRequest).onblocked = () =>
        reject(new Error(blockedErrorMessage));
    }
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openLocalDatabaseRaw(): Promise<IDBDatabase> {
  return requestAsPromise(indexedDB.open(COMPASS_LOCAL_DB_NAME));
}

function deleteLocalDatabaseRaw(): Promise<void> {
  return requestAsPromise(
    indexedDB.deleteDatabase(COMPASS_LOCAL_DB_NAME),
    "Delete database request blocked",
  ).then(() => undefined);
}

async function withLocalDatabase<T>(
  callback: (database: IDBDatabase) => Promise<T>,
): Promise<T> {
  const database = await openLocalDatabaseRaw();
  try {
    return await callback(database);
  } finally {
    database.close();
  }
}

async function runTransaction<T>(
  database: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const transaction = database.transaction(storeNames, mode);
  const [result] = await Promise.all([
    Promise.resolve(callback(transaction)),
    transactionDone(transaction),
  ]);
  return result;
}

async function readLegacyDbSnapshotIfNeeded(): Promise<LegacyDbSnapshot | null> {
  return withLocalDatabase(async (database) => {
    if (!database.objectStoreNames.contains(TASKS_STORE_NAME)) {
      return null;
    }

    const taskStoreKeyPath = await runTransaction(
      database,
      TASKS_STORE_NAME,
      "readonly",
      (transaction) => {
        const taskStore = transaction.objectStore(TASKS_STORE_NAME);
        return taskStore.keyPath;
      },
    );

    if (taskStoreKeyPath !== "id") {
      return null;
    }

    const hasEventsStore =
      database.objectStoreNames.contains(EVENTS_STORE_NAME);
    const storesToRead = hasEventsStore
      ? [EVENTS_STORE_NAME, TASKS_STORE_NAME]
      : [TASKS_STORE_NAME];
    const { events, tasks } = await runTransaction(
      database,
      storesToRead,
      "readonly",
      async (transaction) => {
        const tasks = await requestAsPromise(
          transaction.objectStore(TASKS_STORE_NAME).getAll(),
        );
        const events = hasEventsStore
          ? await requestAsPromise(
              transaction.objectStore(EVENTS_STORE_NAME).getAll(),
            )
          : [];
        return { events, tasks };
      },
    );

    return {
      events: events as Event_Core[],
      tasks: tasks as unknown[],
    };
  });
}

function mapLegacyIndexedDbTask(task: unknown): StoredTask | null {
  if (!task || typeof task !== "object") {
    return null;
  }

  const legacyTask = task as Record<string, unknown> & { dateKey?: unknown };
  if (typeof legacyTask.dateKey !== "string") {
    return null;
  }

  const normalizedTask = normalizeTaskWithLegacyId(legacyTask);
  if (!normalizedTask) {
    return null;
  }

  try {
    return {
      ...normalizeTask(normalizedTask),
      dateKey: legacyTask.dateKey,
    };
  } catch {
    return null;
  }
}

async function migrateLegacyTaskStoreSchemaIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof indexedDB === "undefined") return;

  const legacySnapshot = await readLegacyDbSnapshotIfNeeded();
  if (!legacySnapshot) {
    return;
  }

  compassLocalDB.close();
  resetDatabaseInitialization();
  await deleteLocalDatabaseRaw();
  await ensureDatabaseReady();

  const migratedTasks = legacySnapshot.tasks
    .map(mapLegacyIndexedDbTask)
    .filter((task): task is StoredTask => task !== null);

  await compassLocalDB.transaction(
    "rw",
    compassLocalDB.events,
    compassLocalDB.tasks,
    async () => {
      if (legacySnapshot.events.length > 0) {
        await compassLocalDB.events.bulkPut(legacySnapshot.events);
      }
      if (migratedTasks.length > 0) {
        await compassLocalDB.tasks.bulkPut(migratedTasks);
      }
    },
  );
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
  try {
    await migrateLegacyTaskStoreSchemaIfNeeded();
  } catch (error) {
    console.error("Failed to migrate legacy IndexedDB task schema:", error);
  }
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
          const normalizedTask = normalizeTaskWithLegacyId(item);

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
