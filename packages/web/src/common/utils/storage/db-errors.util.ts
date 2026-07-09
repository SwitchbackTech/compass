import Dexie from "dexie";

/**
 * Base error class for database-related errors
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Error thrown when database initialization fails
 */
export class DatabaseInitError extends DatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "DatabaseInitError";
  }
}

/**
 * Error thrown when a database operation fails
 */
export class DatabaseOperationError extends DatabaseError {
  constructor(
    message: string,
    public readonly operation:
      | "save"
      | "load"
      | "delete"
      | "clear"
      | "reorder"
      | "move",
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "DatabaseOperationError";
  }
}

/**
 * Handles database errors by classifying them and throwing appropriate custom errors.
 * Provides user-friendly error messages and detailed logging for debugging.
 *
 * @param error - The error to handle
 * @param operation - The operation that failed (for error context)
 * @throws DatabaseOperationError with specific error details
 */
export function handleDatabaseError(
  error: unknown,
  operation: "save" | "load" | "delete" | "clear" | "reorder" | "move",
): never {
  // Handle Dexie-specific errors
  if (error instanceof Dexie.QuotaExceededError) {
    throw new DatabaseOperationError(
      "Your browser is out of storage space. Please free some up and try again.",
      operation,
      error,
    );
  }

  if (error instanceof Dexie.VersionError) {
    throw new DatabaseOperationError(
      "Compass needs a quick refresh. Please reload the page.",
      operation,
      error,
    );
  }

  if (error instanceof Dexie.DatabaseClosedError) {
    throw new DatabaseOperationError(
      "Compass briefly lost its local storage. We'll try that again.",
      operation,
      error,
    );
  }

  if (error instanceof Dexie.InvalidTableError) {
    throw new DatabaseOperationError(
      "Invalid database table. This may indicate a data corruption issue.",
      operation,
      error,
    );
  }

  if (error instanceof Dexie.NotFoundError) {
    throw new DatabaseOperationError(
      "Database or object not found.",
      operation,
      error,
    );
  }

  // Already a custom database error - rethrow
  if (error instanceof DatabaseError) {
    throw error;
  }

  // Generic error - wrap it
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new DatabaseOperationError(
    `Database operation failed: ${errorMessage}`,
    operation,
    error,
  );
}
