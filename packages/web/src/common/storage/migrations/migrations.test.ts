/**
 * Tests for the migration runners.
 */
import { createMockStorageAdapter } from "@web/__tests__/utils/storage/mock-storage-adapter.util";
import { DEMO_DATA_SEED_FLAG_KEY } from "@web/common/storage/migrations/external/demo-data-seed";
import {
  runAllMigrations,
  runDataMigrations,
  runExternalMigrations,
} from "@web/common/storage/migrations/migrations";

describe("storage migrations", () => {
  const localStorageMigrationFlagKey =
    "compass.migration.localstorage-tasks-v1";
  const taskStoragePrefix = "compass.today.tasks.";

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
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.removeItem(localStorageMigrationFlagKey);
    localStorage.removeItem(DEMO_DATA_SEED_FLAG_KEY);
    clearTaskStorageKeys();
    jest.restoreAllMocks();
  });

  describe("runDataMigrations", () => {
    it("skips migrations that are already completed", async () => {
      const adapter = createMockStorageAdapter();
      adapter.getMigrationRecords.mockResolvedValue([
        {
          id: "task-id-to-underscore-id-v1",
          completedAt: new Date().toISOString(),
        },
      ]);
      adapter.getAllTasks.mockResolvedValue([]);

      await runDataMigrations(adapter);

      expect(adapter.putTasks).not.toHaveBeenCalled();
    });
  });

  describe("runExternalMigrations", () => {
    it("skips migrations when localStorage flags are already set", async () => {
      localStorage.setItem(localStorageMigrationFlagKey, "completed");
      localStorage.setItem(DEMO_DATA_SEED_FLAG_KEY, "completed");

      const adapter = createMockStorageAdapter();

      await runExternalMigrations(adapter);

      expect(adapter.putTasks).not.toHaveBeenCalled();
    });

    it("runs migrations and sets flags when not previously completed", async () => {
      const adapter = createMockStorageAdapter();
      adapter.getTasks.mockResolvedValue([]);
      adapter.putTasks.mockResolvedValue(undefined);

      await runExternalMigrations(adapter);

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

      const adapter = createMockStorageAdapter();

      await expect(runExternalMigrations(adapter)).resolves.not.toThrow();
      // localStorage migration should not be marked completed due to invalid JSON
      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBeNull();
    });
  });

  describe("runAllMigrations", () => {
    it("runs data then external migrations without error", async () => {
      const adapter = createMockStorageAdapter();
      adapter.getTasks.mockResolvedValue([]);

      await expect(runAllMigrations(adapter)).resolves.toBeUndefined();
      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBe(
        "completed",
      );
      expect(localStorage.getItem(DEMO_DATA_SEED_FLAG_KEY)).toBe("completed");
    });
  });
});
