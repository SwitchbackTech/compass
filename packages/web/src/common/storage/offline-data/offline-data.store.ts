import { type LocalStoredEvent } from "@web/common/storage/types/local-event.types";
import { type Task } from "@web/common/types/task.types";

/**
 * Record of a completed migration.
 */
export interface MigrationRecord {
  id: string;
  completedAt: string;
}

/**
 * Task stored with its associated date key.
 */
export interface StoredTask extends Task {
  dateKey: string;
}

/**
 * Abstract store for structured offline event and task data.
 *
 * This interface defines storage operations independently of the underlying
 * storage technology (IndexedDB, SQLite, etc.). Implementations handle
 * storage-specific details like schema migrations internally.
 *
 * Benefits:
 * - Storage-agnostic application code
 * - Easy to swap implementations (IndexedDB → SQLite)
 * - Testable via mock stores
 */
export interface OfflineDataStore {
  /**
   * Initialize storage and run internal schema migrations.
   * Must be called before any other operations.
   */
  initialize(): Promise<void>;

  /**
   * Check if storage has been initialized and is ready for operations.
   */
  isReady(): boolean;

  /** Close any active storage connection. */
  close?(): void;

  // ─── Task Operations ───────────────────────────────────────────────────────

  /**
   * Get all tasks for a specific date.
   */
  getTasks(dateKey: string): Promise<Task[]>;

  /**
   * Get all tasks across all dates.
   */
  getAllTasks(): Promise<StoredTask[]>;

  /**
   * Save tasks for a specific date, replacing any existing tasks for that date.
   */
  putTasks(dateKey: string, tasks: Task[]): Promise<void>;

  /**
   * Save or update a single task for a specific date.
   * Uses upsert semantics - inserts or updates by task _id.
   */
  putTask(dateKey: string, task: Task): Promise<void>;

  /**
   * Delete a single task by ID.
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Move a task from one date to another.
   */
  moveTask(task: Task, fromDateKey: string, toDateKey: string): Promise<void>;

  /**
   * Clear all tasks from storage.
   */
  clearAllTasks(): Promise<void>;

  // ─── Event Operations ──────────────────────────────────────────────────────

  /**
   * Get events overlapping a date range.
   */
  getEvents(
    startDate: string,
    endDate: string,
    isSomeday?: boolean,
  ): Promise<LocalStoredEvent[]>;

  /**
   * Get all events without filtering.
   */
  getAllEvents(): Promise<LocalStoredEvent[]>;

  /**
   * Save or update a single event.
   */
  putEvent(event: LocalStoredEvent): Promise<void>;

  /**
   * Save or update multiple events.
   */
  putEvents(events: LocalStoredEvent[]): Promise<void>;

  /**
   * Delete an event by ID.
   */
  deleteEvent(eventId: string): Promise<void>;

  /**
   * Clear all events from storage.
   */
  clearAllEvents(): Promise<void>;

  // ─── Migration Tracking ────────────────────────────────────────────────────

  /**
   * Get all completed migration records.
   */
  getMigrationRecords(): Promise<MigrationRecord[]>;

  /**
   * Record a migration as completed.
   */
  setMigrationRecord(id: string): Promise<void>;
}
