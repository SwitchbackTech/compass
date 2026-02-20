const COMPASS_LOCAL_DB_NAME = "compass-local";
const DEMO_DATA_SEED_MIGRATION_FLAG = "compass.migration.demo-data-seed-v1";

export async function clearCompassLocalDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(COMPASS_LOCAL_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Prepares empty storage for tests that expect no data.
 * Clears localStorage and IndexedDB, then sets the demo-data-seed migration
 * flag so it won't seed when storage initializes.
 */
export async function prepareEmptyStorageForTests(): Promise<void> {
  localStorage.clear();
  await clearCompassLocalDb();
  localStorage.setItem(DEMO_DATA_SEED_MIGRATION_FLAG, "completed");
}
