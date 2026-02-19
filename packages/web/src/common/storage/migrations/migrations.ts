import { StorageAdapter } from "../adapter/storage.adapter";
import { localStorageTasksMigration } from "./external/localstorage-tasks";
import { DataMigration, ExternalMigration } from "./migration.types";

// ─── Migration Registry ──────────────────────────────────────────────────────
// Add new migrations to these arrays. They run in order.

/**
 * Data migrations transform existing data within storage.
 * Tracked via the storage adapter's migration records.
 */
export const dataMigrations: DataMigration[] = [
  // Add data migrations here as needed:
  // addUserFieldMigration,
  // renameStatusFieldMigration,
];

/**
 * External migrations import data from outside storage.
 * Tracked via localStorage flags.
 */
export const externalMigrations: ExternalMigration[] = [
  localStorageTasksMigration,
];

// ─── Migration Runners ───────────────────────────────────────────────────────

/**
 * Run all pending data migrations.
 *
 * Data migrations are tracked in the storage adapter's _migrations table.
 * Each migration only runs once - its ID is recorded after completion.
 */
export async function runDataMigrations(
  adapter: StorageAdapter,
): Promise<void> {
  if (dataMigrations.length === 0) return;

  const completedRecords = await adapter.getMigrationRecords();
  const completedIds = new Set(completedRecords.map((r) => r.id));

  for (const migration of dataMigrations) {
    if (completedIds.has(migration.id)) {
      continue;
    }

    console.log(`[Migration] Running data migration: ${migration.id}`);
    try {
      await migration.migrate(adapter);
      await adapter.setMigrationRecord(migration.id);
      console.log(`[Migration] Completed: ${migration.id}`);
    } catch (error) {
      console.error(`[Migration] Failed: ${migration.id}`, error);
      throw error; // Data migrations are critical - fail fast
    }
  }
}

/**
 * Run all pending external migrations.
 *
 * External migrations are tracked via localStorage flags since they
 * import data from sources outside the storage adapter. Failures are
 * logged but don't block app startup - data stays in source for retry.
 */
export async function runExternalMigrations(
  adapter: StorageAdapter,
): Promise<void> {
  if (typeof localStorage === "undefined") {
    return;
  }

  for (const migration of externalMigrations) {
    const flagKey = `compass.migration.${migration.id}`;

    if (localStorage.getItem(flagKey) === "completed") {
      continue;
    }

    console.log(`[Migration] Running external migration: ${migration.id}`);
    try {
      await migration.migrate(adapter);
      const isComplete = migration.isComplete
        ? await migration.isComplete()
        : true;

      if (!isComplete) {
        console.warn(`[Migration] Incomplete (will retry): ${migration.id}`);
        continue;
      }

      localStorage.setItem(flagKey, "completed");
      console.log(`[Migration] Completed: ${migration.id}`);
    } catch (error) {
      // External migrations are non-blocking - data stays in source for retry
      console.error(
        `[Migration] Failed (non-blocking): ${migration.id}`,
        error,
      );
    }
  }
}

/**
 * Run all migrations in the correct order.
 *
 * Order:
 * 1. Data migrations (storage-agnostic transformations)
 * 2. External migrations (imports from localStorage, etc.)
 */
export async function runAllMigrations(adapter: StorageAdapter): Promise<void> {
  await runDataMigrations(adapter);
  await runExternalMigrations(adapter);
}

// Re-export types for convenience
export type { DataMigration, ExternalMigration } from "./migration.types";
