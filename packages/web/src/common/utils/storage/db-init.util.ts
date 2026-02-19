/**
 * Database initialization utilities - compatibility layer.
 *
 * @deprecated These functions delegate to the StorageAdapter.
 * New code should use initializeStorage() from @web/common/storage/adapter.
 *
 * @see {@link @web/common/storage/adapter}
 */
import {
  ensureStorageReady,
  initializeStorage,
  isStorageReady,
  resetStorage,
} from "@web/common/storage/adapter/adapter";

/**
 * Initializes the IndexedDB database.
 * @deprecated Use initializeStorage() from @web/common/storage/adapter instead
 */
export async function initializeDatabase(): Promise<void> {
  await initializeStorage();
}

/**
 * Checks if the database is ready without triggering initialization.
 * @deprecated Use isStorageReady() from @web/common/storage/adapter instead
 */
export function isDatabaseReady(): boolean {
  return isStorageReady();
}

/**
 * Ensures the database is ready before performing operations.
 * @deprecated Use ensureStorageReady() from @web/common/storage/adapter instead
 */
export async function ensureDatabaseReady(): Promise<void> {
  await ensureStorageReady();
}

/**
 * Resets the initialization state. Useful for testing.
 * @deprecated Use resetStorage() from @web/common/storage/adapter instead
 */
export function resetDatabaseInitialization(): void {
  resetStorage();
}
