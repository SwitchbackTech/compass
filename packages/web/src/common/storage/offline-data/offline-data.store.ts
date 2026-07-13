import { type EventId } from "@core/types/domain-primitives";
import { type EventListQuery } from "@core/types/event-command.contracts";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";

/** Bulk sortOrder patch item, matching ReorderEventsInput["items"]. */
export interface LocalEventOrderPatch {
  eventId: EventId;
  sortOrder: number;
}

/**
 * Record of a completed migration.
 */
export interface MigrationRecord {
  id: string;
  completedAt: string;
}

/**
 * A task row as persisted in the legacy `tasks` table.
 *
 * The Tasks feature was removed (2026-07), but existing rows are retained in
 * IndexedDB so users can recover them on their own. This minimal row type
 * exists only so the Dexie schema-upgrade path (see legacy-primary-key.
 * migration.ts) can read and re-insert those rows without data loss. Nothing
 * in the app reads or writes tasks anymore.
 */
export interface StoredTask {
  _id: string;
  dateKey: string;
  title: string;
  status: "todo" | "completed";
  order: number;
  createdAt: string;
  user: string;
}

/**
 * Abstract store for structured offline event data.
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

  // ─── Event Operations ──────────────────────────────────────────────────────

  /**
   * Get events matching a range or someday query (B_E).
   */
  getEvents(query: EventListQuery): Promise<LocalEventRecord[]>;

  /**
   * Get all events without filtering.
   */
  getAllEvents(): Promise<LocalEventRecord[]>;

  /**
   * Save or update a single event record.
   */
  putEvent(record: LocalEventRecord): Promise<void>;

  /**
   * Save or update multiple event records.
   */
  putEvents(records: LocalEventRecord[]): Promise<void>;

  /**
   * Delete an event by ID.
   */
  deleteEvent(eventId: EventId): Promise<void>;

  /**
   * Patch the `schedule.sortOrder` field on the given someday events,
   * leaving every other field untouched. Ids not present in storage are
   * ignored.
   */
  updateEventOrders(items: LocalEventOrderPatch[]): Promise<void>;

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
