import { session } from "@web/common/classes/Session";
import { TODAY_TASKS_STORAGE_KEY_PREFIX } from "@web/common/utils/storage/storage.util";

/**
 * Clears all Compass-related browser storage including:
 * - LocalStorage (tasks, preferences, auth flags)
 * - Session cookies (via SuperTokens signOut)
 * - IndexedDB (compass-local database)
 *
 * This is typically called after account deletion to ensure a clean state.
 */
export async function clearAllBrowserStorage(): Promise<void> {
  try {
    // 1. Sign out from SuperTokens session (clears session cookies)
    await session.signOut();

    // 2. Clear all localStorage keys that start with 'compass.'
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith("compass.") ||
        key?.startsWith(TODAY_TASKS_STORAGE_KEY_PREFIX)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // 3. Clear IndexedDB 'compass-local' database if it exists
    if (window.indexedDB) {
      const databases = await window.indexedDB.databases();
      const compassDb = databases.find((db) => db.name === "compass-local");
      if (compassDb) {
        await new Promise<void>((resolve, reject) => {
          const deleteRequest =
            window.indexedDB.deleteDatabase("compass-local");
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () =>
            reject(new Error("Failed to delete IndexedDB"));
          deleteRequest.onblocked = () => {
            console.warn(
              "IndexedDB deletion blocked - close all tabs and try again",
            );
            resolve();
          };
        });
      }
    }

    console.log("Browser storage cleared successfully");
  } catch (error) {
    console.error("Error clearing browser storage:", error);
    throw error;
  }
}

/**
 * Checks if the browser has any Compass-related storage
 */
export function hasCompassStorage(): boolean {
  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key?.startsWith("compass.") ||
      key?.startsWith(TODAY_TASKS_STORAGE_KEY_PREFIX)
    ) {
      return true;
    }
  }
  return false;
}
