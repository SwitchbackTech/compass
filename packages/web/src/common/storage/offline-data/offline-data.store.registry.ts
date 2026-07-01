import { IndexedDbOfflineDataStore } from "./indexeddb-offline-data.store";
import { type OfflineDataStore } from "./offline-data.store";

let store: OfflineDataStore | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Get the offline data store singleton.
 *
 * The store is lazily instantiated on first call. To switch persistence
 * implementations (e.g., IndexedDB → SQLite), change the instantiation
 * here.
 */
export function getOfflineDataStore(): OfflineDataStore {
  if (!store) {
    store = new IndexedDbOfflineDataStore();
  }
  return store;
}

/**
 * Initialize the offline data store and run all migrations.
 *
 * This should be called once at app startup. It:
 * 1. Initializes the offline data store (runs schema migrations internally)
 * 2. Runs data migrations (storage-agnostic transformations)
 * 3. Runs external migrations (imports from localStorage, etc.)
 *
 * Safe to call multiple times - subsequent calls return the same promise.
 */
export async function initializeOfflineDataStore(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const offlineDataStore = getOfflineDataStore();
    await offlineDataStore.initialize();

    // Import migrations dynamically to avoid circular dependencies
    const { runAllMigrations } = await import("../migrations/migrations");
    await runAllMigrations(offlineDataStore);
  })().catch((error) => {
    // Allow retry if initialization fails.
    initPromise = null;
    throw error;
  });

  return initPromise;
}

/**
 * Check if the offline data store is ready for operations.
 */
export function isOfflineDataStoreReady(): boolean {
  return store?.isReady() ?? false;
}

/**
 * Ensure the offline data store is initialized before performing operations.
 * If not initialized, triggers initialization.
 */
export async function ensureOfflineDataStoreReady(): Promise<void> {
  if (!isOfflineDataStoreReady()) {
    await initializeOfflineDataStore();
  }
}

/**
 * Reset the offline data store state. Used for testing only.
 */
export function resetOfflineDataStore(): void {
  store?.close?.();
  store = null;
  initPromise = null;
}

export async function resetOfflineDataStoreAsync(): Promise<void> {
  const pendingInit = initPromise;

  if (pendingInit) {
    try {
      await pendingInit;
    } catch {
      // Ignore init failures while resetting test state.
    }
  }

  resetOfflineDataStore();
}

export type {
  MigrationRecord,
  OfflineDataStore,
  StoredTask,
} from "./offline-data.store";
