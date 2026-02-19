/**
 * Task migration utilities - compatibility layer.
 *
 * @deprecated The migration system has been refactored.
 * Migrations are now handled automatically by initializeStorage() from
 * @web/common/storage/adapter. This file is kept for backward compatibility.
 *
 * @see {@link @web/common/storage/migrations}
 */

const MIGRATION_FLAG_KEY = "compass.tasks.migrated-to-indexeddb";
const NEW_MIGRATION_FLAG_KEY = "compass.migration.localstorage-tasks-v1";

/**
 * Checks if task migration from localStorage to IndexedDB has been completed.
 * @deprecated Migrations are now handled automatically by initializeStorage()
 */
export function hasTaskMigrationCompleted(): boolean {
  if (typeof window === "undefined") return true;
  // Check both old and new migration flags
  return (
    localStorage.getItem(MIGRATION_FLAG_KEY) === "true" ||
    localStorage.getItem(NEW_MIGRATION_FLAG_KEY) === "completed"
  );
}

/**
 * Migrates all tasks from localStorage to IndexedDB.
 *
 * @deprecated This migration is now handled automatically by initializeStorage().
 * The new migration system runs the localstorage-tasks-v1 external migration
 * when storage is initialized. This function is kept for backward compatibility
 * and now returns 0 since the migration runs elsewhere.
 *
 * @returns Always returns 0 (migration runs automatically during init)
 */
export async function migrateTasksFromLocalStorageToIndexedDB(): Promise<number> {
  // Migration is now handled by the external migrations system
  // See: @web/common/storage/migrations/external/localstorage-tasks.ts
  return 0;
}

/**
 * Resets the migration flag. Used for testing.
 * @deprecated Use localStorage.removeItem() directly for testing
 */
export function resetTaskMigrationFlag(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  localStorage.removeItem(NEW_MIGRATION_FLAG_KEY);
}
