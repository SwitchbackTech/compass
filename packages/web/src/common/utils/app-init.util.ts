import { toast } from "react-toastify";
import { initializeDatabase } from "@web/common/utils/storage/db-init.util";
import { migrateTasksFromLocalStorageToIndexedDB } from "@web/common/utils/storage/task-migration.util";
import { DatabaseInitError } from "./storage/db-errors.util";

export interface AppInitResult {
  dbInitError: DatabaseInitError | null;
  tasksMigrated: number;
}

/**
 * Initialize the database for the application.
 * Returns any initialization error so the caller can handle it appropriately.
 */
export async function initializeDatabaseWithErrorHandling(): Promise<AppInitResult> {
  let dbInitError: DatabaseInitError | null = null;
  let tasksMigrated = 0;

  try {
    await initializeDatabase();

    // After database is ready, migrate tasks from localStorage to IndexedDB
    tasksMigrated = await migrateTasksFromLocalStorageToIndexedDB();
  } catch (error) {
    if (error instanceof DatabaseInitError) {
      dbInitError = error;
    }
    // Continue app initialization - the app can still work without local storage
    // by falling back to remote-only mode when authenticated
  }

  return { dbInitError, tasksMigrated };
}

/**
 * Show a toast notification for database initialization errors.
 * Should be called after the app renders so the toast container is available.
 */
export function showDbInitErrorToast(dbInitError: DatabaseInitError): void {
  // Use setTimeout to ensure toast container is mounted
  setTimeout(() => {
    toast.error(
      `Offline storage unavailable: ${dbInitError.message}. Your data will not be saved locally.`,
      {
        autoClose: false,
        position: "bottom-right",
      },
    );
  }, 100);
}
