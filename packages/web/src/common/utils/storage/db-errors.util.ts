/**
 * Base error class for database-related errors
 */
class DatabaseError extends Error {
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
