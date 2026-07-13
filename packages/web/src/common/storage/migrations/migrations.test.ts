/**
 * Tests for the migration runners.
 */

import { createMockOfflineDataStore } from "@web/__tests__/utils/storage/mock-offline-data-store.util";
import { DEMO_DATA_SEED_FLAG_KEY } from "@web/common/storage/migrations/external/demo-data-seed";
import {
  runAllMigrations,
  runDataMigrations,
  runExternalMigrations,
} from "@web/common/storage/migrations/migrations";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("storage migrations", () => {
  const localStorageMigrationFlagKey =
    "compass.migration.localstorage-tasks-v1";
  const taskStoragePrefix = "compass.today.tasks.";

  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;

  function clearTaskStorageKeys(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(taskStoragePrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  beforeEach(() => {
    localStorage.removeItem(localStorageMigrationFlagKey);
    localStorage.removeItem(DEMO_DATA_SEED_FLAG_KEY);
    clearTaskStorageKeys();
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.removeItem(localStorageMigrationFlagKey);
    localStorage.removeItem(DEMO_DATA_SEED_FLAG_KEY);
    clearTaskStorageKeys();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("runDataMigrations", () => {
    it("skips migrations that are already completed", async () => {
      const store = createMockOfflineDataStore();
      store.getMigrationRecords.mockResolvedValue([
        {
          id: "task-id-to-underscore-id-v1",
          completedAt: new Date().toISOString(),
        },
      ]);
      store.getAllTasks.mockResolvedValue([]);

      await runDataMigrations(store);

      expect(store.putTasks).not.toHaveBeenCalled();
    });
  });

  describe("runExternalMigrations", () => {
    it("skips migrations when localStorage flags are already set", async () => {
      localStorage.setItem(localStorageMigrationFlagKey, "completed");
      localStorage.setItem(DEMO_DATA_SEED_FLAG_KEY, "completed");

      const store = createMockOfflineDataStore();

      await runExternalMigrations(store);

      expect(store.putTasks).not.toHaveBeenCalled();
    });

    it("runs migrations and sets flags when not previously completed", async () => {
      const store = createMockOfflineDataStore();
      store.getTasks.mockResolvedValue([]);
      store.putTasks.mockResolvedValue(undefined);

      await runExternalMigrations(store);

      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBe(
        "completed",
      );
      expect(localStorage.getItem(DEMO_DATA_SEED_FLAG_KEY)).toBe("completed");
    });

    it("does not throw when migration fails (non-blocking)", async () => {
      // Set demo data seed as completed so we isolate the localStorage migration test
      localStorage.setItem(DEMO_DATA_SEED_FLAG_KEY, "completed");
      localStorage.setItem(
        "compass.today.tasks.2025-01-01",
        "invalid json {{{",
      );

      const store = createMockOfflineDataStore();

      await expect(runExternalMigrations(store)).resolves.toBeUndefined();
      // localStorage migration should not be marked completed due to invalid JSON
      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBeNull();
    });
  });

  describe("runAllMigrations", () => {
    it("runs data then external migrations without error", async () => {
      const store = createMockOfflineDataStore();
      store.getTasks.mockResolvedValue([]);

      await expect(runAllMigrations(store)).resolves.toBeUndefined();
      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBe(
        "completed",
      );
      expect(localStorage.getItem(DEMO_DATA_SEED_FLAG_KEY)).toBe("completed");
    });
  });
});
