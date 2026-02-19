const COMPASS_LOCAL_DB_NAME = "compass-local";

export async function clearCompassLocalDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(COMPASS_LOCAL_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
