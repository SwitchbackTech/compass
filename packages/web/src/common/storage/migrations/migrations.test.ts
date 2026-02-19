/**
 * Tests for the migration runners.
 */
import { StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import {
  runAllMigrations,
  runDataMigrations,
  runExternalMigrations,
} from "@web/common/storage/migrations/migrations";

function createMockAdapter(): jest.Mocked<StorageAdapter> {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getTasks: jest.fn().mockResolvedValue([]),
    getAllTasks: jest.fn().mockResolvedValue([]),
    putTasks: jest.fn().mockResolvedValue(undefined),
    putTask: jest.fn().mockResolvedValue(undefined),
    deleteTask: jest.fn().mockResolvedValue(undefined),
    moveTask: jest.fn().mockResolvedValue(undefined),
    clearAllTasks: jest.fn().mockResolvedValue(undefined),
    getEvents: jest.fn().mockResolvedValue([]),
    getAllEvents: jest.fn().mockResolvedValue([]),
    putEvent: jest.fn().mockResolvedValue(undefined),
    putEvents: jest.fn().mockResolvedValue(undefined),
    deleteEvent: jest.fn().mockResolvedValue(undefined),
    clearAllEvents: jest.fn().mockResolvedValue(undefined),
    getMigrationRecords: jest.fn().mockResolvedValue([]),
    setMigrationRecord: jest.fn().mockResolvedValue(undefined),
  };
}

describe("storage migrations", () => {
  const localStorageMigrationFlagKey =
    "compass.migration.localstorage-tasks-v1";
  const demoDataSeedFlagKey = "compass.migration.demo-data-seed-v1";
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
    localStorage.removeItem(demoDataSeedFlagKey);
    clearTaskStorageKeys();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.removeItem(localStorageMigrationFlagKey);
    localStorage.removeItem(demoDataSeedFlagKey);
    clearTaskStorageKeys();
    jest.restoreAllMocks();
  });

  describe("runDataMigrations", () => {
    it("skips migrations that are already completed", async () => {
      const adapter = createMockAdapter();
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
      localStorage.setItem(demoDataSeedFlagKey, "completed");

      const adapter = createMockAdapter();

      await runExternalMigrations(adapter);

      expect(adapter.putTasks).not.toHaveBeenCalled();
    });

    it("runs migrations and sets flags when not previously completed", async () => {
      const adapter = createMockAdapter();
      adapter.getTasks.mockResolvedValue([]);
      adapter.putTasks.mockResolvedValue(undefined);

      await runExternalMigrations(adapter);

      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBe(
        "completed",
      );
      expect(localStorage.getItem(demoDataSeedFlagKey)).toBe("completed");
    });

    it("does not throw when migration fails (non-blocking)", async () => {
      // Set demo data seed as completed so we isolate the localStorage migration test
      localStorage.setItem(demoDataSeedFlagKey, "completed");
      localStorage.setItem(
        "compass.today.tasks.2025-01-01",
        "invalid json {{{",
      );

      const adapter = createMockAdapter();

      await expect(runExternalMigrations(adapter)).resolves.not.toThrow();
      // localStorage migration should not be marked completed due to invalid JSON
      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBeNull();
    });
  });

  describe("runAllMigrations", () => {
    it("runs data then external migrations without error", async () => {
      const adapter = createMockAdapter();
      adapter.getTasks.mockResolvedValue([]);

      await expect(runAllMigrations(adapter)).resolves.toBeUndefined();
      expect(localStorage.getItem(localStorageMigrationFlagKey)).toBe(
        "completed",
      );
      expect(localStorage.getItem(demoDataSeedFlagKey)).toBe("completed");
    });
  });
});
