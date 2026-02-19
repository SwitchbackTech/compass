import { IndexedDBAdapter } from "./indexeddb.adapter";
import { StorageAdapter } from "./storage.adapter";

let adapter: StorageAdapter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Get the storage adapter singleton.
 *
 * The adapter is lazily instantiated on first call. To switch storage
 * implementations (e.g., IndexedDB → SQLite), change the instantiation
 * here.
 */
export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    // Switch this line to use a different adapter implementation
    adapter = new IndexedDBAdapter();
  }
  return adapter;
}

/**
 * Initialize storage and run all migrations.
 *
 * This should be called once at app startup. It:
 * 1. Initializes the storage adapter (runs schema migrations internally)
 * 2. Runs data migrations (storage-agnostic transformations)
 * 3. Runs external migrations (imports from localStorage, etc.)
 *
 * Safe to call multiple times - subsequent calls return the same promise.
 */
export async function initializeStorage(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const storage = getStorageAdapter();
    await storage.initialize();

    // Import migrations dynamically to avoid circular dependencies
    const { runAllMigrations } = await import("../migrations/migrations");
    await runAllMigrations(storage);
  })();

  return initPromise;
}

/**
 * Check if storage is ready for operations.
 */
export function isStorageReady(): boolean {
  return adapter?.isReady() ?? false;
}

/**
 * Ensure storage is initialized before performing operations.
 * If not initialized, triggers initialization.
 */
export async function ensureStorageReady(): Promise<void> {
  if (!isStorageReady()) {
    await initializeStorage();
  }
}

/**
 * Reset storage state. Used for testing only.
 */
export function resetStorage(): void {
  adapter = null;
  initPromise = null;
}

export type {
  MigrationRecord,
  StorageAdapter,
  StoredTask,
} from "./storage.adapter";
