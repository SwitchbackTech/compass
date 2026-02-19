import { StorageAdapter } from "../adapter/storage.adapter";

/**
 * Data migration - transforms existing data within storage.
 *
 * Data migrations work through the abstract StorageAdapter interface,
 * making them storage-agnostic. They're tracked in the storage's
 * _migrations table and only run once.
 *
 * Use cases:
 * - Renaming fields
 * - Computing derived values
 * - Restructuring data
 *
 * Example:
 * ```typescript
 * const addUserIdMigration: DataMigration = {
 *   id: "add-user-id-v1",
 *   description: "Add user field to tasks missing it",
 *   async migrate(adapter) {
 *     const tasks = await adapter.getAllTasks();
 *     // transform and save tasks...
 *   }
 * };
 * ```
 */
export interface DataMigration {
  /** Unique identifier for this migration */
  id: string;
  /** Human-readable description */
  description: string;
  /** Migration function that transforms data */
  migrate: (adapter: StorageAdapter) => Promise<void>;
}

/**
 * External migration - imports data from external sources.
 *
 * External migrations import data from sources outside the storage
 * adapter (localStorage, files, APIs, etc.). They're tracked via
 * localStorage flags since the source may not be the storage adapter.
 *
 * Use cases:
 * - Migrating from localStorage to IndexedDB
 * - Importing from legacy storage formats
 * - One-time data imports
 *
 * Example:
 * ```typescript
 * const importSettingsMigration: ExternalMigration = {
 *   id: "import-settings-v1",
 *   description: "Import user settings from localStorage",
 *   async migrate(adapter) {
 *     const settings = localStorage.getItem("settings");
 *     if (settings) {
 *       await adapter.putSettings(JSON.parse(settings));
 *     }
 *   }
 * };
 * ```
 */
export interface ExternalMigration {
  /** Unique identifier for this migration */
  id: string;
  /** Human-readable description */
  description: string;
  /** Migration function that imports external data */
  migrate: (adapter: StorageAdapter) => Promise<void>;
  /**
   * Optional completion check.
   *
   * When provided, migration completion is only recorded if this returns true.
   * Useful for partial migrations that should retry on next startup.
   */
  isComplete?: () => boolean | Promise<boolean>;
}
