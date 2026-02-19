/**
 * Tests for the task migration compatibility layer.
 *
 * The actual migration logic has been moved to the new storage migration system:
 * @see {@link @web/common/storage/migrations/external/localstorage-tasks.ts}
 *
 * These tests verify the compatibility layer's behavior.
 */
import {
  hasTaskMigrationCompleted,
  migrateTasksFromLocalStorageToIndexedDB,
  resetTaskMigrationFlag,
} from "./task-migration.util";

describe("task-migration.util (compatibility layer)", () => {
  const MIGRATION_FLAG_KEY = "compass.tasks.migrated-to-indexeddb";
  const NEW_MIGRATION_FLAG_KEY = "compass.migration.localstorage-tasks-v1";

  beforeEach(() => {
    // Clear migration flags
    localStorage.removeItem(MIGRATION_FLAG_KEY);
    localStorage.removeItem(NEW_MIGRATION_FLAG_KEY);
  });

  afterEach(() => {
    // Clean up
    localStorage.removeItem(MIGRATION_FLAG_KEY);
    localStorage.removeItem(NEW_MIGRATION_FLAG_KEY);
  });

  describe("hasTaskMigrationCompleted", () => {
    it("should return false when no migration flag is set", () => {
      expect(hasTaskMigrationCompleted()).toBe(false);
    });

    it("should return true when old migration flag is set", () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      expect(hasTaskMigrationCompleted()).toBe(true);
    });

    it("should return true when new migration flag is set", () => {
      localStorage.setItem(NEW_MIGRATION_FLAG_KEY, "completed");
      expect(hasTaskMigrationCompleted()).toBe(true);
    });
  });

  describe("migrateTasksFromLocalStorageToIndexedDB", () => {
    it("should always return 0 (migration handled by new system)", async () => {
      const result = await migrateTasksFromLocalStorageToIndexedDB();
      expect(result).toBe(0);
    });
  });

  describe("resetTaskMigrationFlag", () => {
    it("should remove both old and new migration flags", () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      localStorage.setItem(NEW_MIGRATION_FLAG_KEY, "completed");

      resetTaskMigrationFlag();

      expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBeNull();
      expect(localStorage.getItem(NEW_MIGRATION_FLAG_KEY)).toBeNull();
    });

    it("should result in hasTaskMigrationCompleted returning false", () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      expect(hasTaskMigrationCompleted()).toBe(true);

      resetTaskMigrationFlag();

      expect(hasTaskMigrationCompleted()).toBe(false);
    });
  });
});
