import Dexie from "dexie";
import { compassLocalDB } from "./compass-local.db";

/**
 * Database initialization state tracking
 */
let dbInitPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Custom error for database initialization failures
 */
export class DatabaseInitError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseInitError";
  }
}

/**
 * Initializes the IndexedDB database with explicit .open() call.
 * Uses singleton pattern to ensure only one initialization happens.
 * Implements retry logic for transient failures.
 *
 * @returns Promise that resolves when database is ready
 * @throws DatabaseInitError if initialization fails after retries
 */
export async function initializeDatabase(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (dbInitPromise) {
    return dbInitPromise;
  }

  // Return immediately if already initialized
  if (isInitialized) {
    return Promise.resolve();
  }

  dbInitPromise = (async () => {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Critical: Explicitly open the database
        await compassLocalDB.open();

        // Verify database is ready
        const isOpen = compassLocalDB.isOpen();

        if (!isOpen) {
          throw new DatabaseInitError(
            "Database opened but isOpen() returned false",
          );
        }

        isInitialized = true;
        return;
      } catch (error) {
        lastError = error;

        // Handle specific Dexie errors - don't retry these
        if (error instanceof Dexie.VersionError) {
          throw new DatabaseInitError(
            "Database version mismatch. Please reload the page.",
            error,
          );
        }

        if (error instanceof Dexie.QuotaExceededError) {
          throw new DatabaseInitError(
            "Storage quota exceeded. Please free up space.",
            error,
          );
        }

        // For other errors, retry with exponential backoff
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All retries failed
    dbInitPromise = null; // Reset to allow future retry
    throw new DatabaseInitError(
      `Failed to initialize IndexedDB after ${maxRetries} attempts`,
      lastError,
    );
  })();

  return dbInitPromise;
}

/**
 * Checks if the database is ready without triggering initialization.
 * Synchronous check for performance.
 *
 * @returns true if database is initialized and open
 */
export function isDatabaseReady(): boolean {
  return isInitialized && compassLocalDB.isOpen();
}

/**
 * Ensures the database is ready before performing operations.
 * Should be called at the start of all database operations.
 * If database is not ready, triggers initialization.
 *
 * @returns Promise that resolves when database is ready
 * @throws DatabaseInitError if initialization fails
 */
export async function ensureDatabaseReady(): Promise<void> {
  if (!isDatabaseReady()) {
    await initializeDatabase();
  }
}

/**
 * Resets the initialization state. Useful for testing.
 * WARNING: Only use in tests, never in production code.
 */
export function resetDatabaseInitialization(): void {
  dbInitPromise = null;
  isInitialized = false;
}
