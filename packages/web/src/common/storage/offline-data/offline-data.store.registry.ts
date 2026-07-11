import { IndexedDbOfflineDataStore } from "./indexeddb-offline-data.store";
import { type OfflineDataStore } from "./offline-data.store";

let store: OfflineDataStore | null = null;
let initPromise: Promise<void> | null = null;

// Test-only function overrides, keyed by export name. `bun:test`'s
// `mock.module` redirects future module *resolution*, but a module that
// already captured a live binding to one of these exports before a later
// `mock.module` call (e.g. local.event.repository.ts calling
// `getOfflineDataStore` internally) keeps referencing whatever was current
// at its own first import, forever — a later `mock.module` call cannot fix
// an already-linked consumer. Every export below instead reads this object
// at CALL time, so every caller (regardless of when it first imported this
// module) always observes the current test's override.
type RegistryTestOverrides = Partial<{
  getOfflineDataStore: () => OfflineDataStore;
  ensureOfflineDataStoreReady: () => Promise<void>;
  initializeOfflineDataStore: () => Promise<void>;
  isOfflineDataStoreReady: () => boolean;
}>;

let testOverrides: RegistryTestOverrides = {};

export function setOfflineDataStoreTestOverrides(
  overrides: RegistryTestOverrides,
): void {
  testOverrides = overrides;
}

/**
 * Get the offline data store singleton.
 *
 * The store is lazily instantiated on first call. To switch persistence
 * implementations (e.g., IndexedDB → SQLite), change the instantiation
 * here.
 */
export function getOfflineDataStore(): OfflineDataStore {
  if (testOverrides.getOfflineDataStore) {
    return testOverrides.getOfflineDataStore();
  }

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
  if (testOverrides.initializeOfflineDataStore) {
    return testOverrides.initializeOfflineDataStore();
  }

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
  if (testOverrides.isOfflineDataStoreReady) {
    return testOverrides.isOfflineDataStoreReady();
  }

  return store?.isReady() ?? false;
}

/**
 * Ensure the offline data store is initialized before performing operations.
 * If not initialized, triggers initialization.
 */
export async function ensureOfflineDataStoreReady(): Promise<void> {
  if (testOverrides.ensureOfflineDataStoreReady) {
    return testOverrides.ensureOfflineDataStoreReady();
  }

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
