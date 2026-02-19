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
  const externalMigrationFlagKey = "compass.migration.localstorage-tasks-v1";
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
    localStorage.removeItem(externalMigrationFlagKey);
    clearTaskStorageKeys();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.removeItem(externalMigrationFlagKey);
    clearTaskStorageKeys();
    jest.restoreAllMocks();
  });

  describe("runDataMigrations", () => {
    it("returns early when dataMigrations array is empty", async () => {
      const adapter = createMockAdapter();

      await runDataMigrations(adapter);

      expect(adapter.getMigrationRecords).not.toHaveBeenCalled();
    });
  });

  describe("runExternalMigrations", () => {
    it("skips migration when localStorage flag is already set", async () => {
      localStorage.setItem(externalMigrationFlagKey, "completed");

      const adapter = createMockAdapter();

      await runExternalMigrations(adapter);

      expect(adapter.putTasks).not.toHaveBeenCalled();
    });

    it("runs migration and sets flag when not previously completed", async () => {
      const adapter = createMockAdapter();
      adapter.getTasks.mockResolvedValue([]);
      adapter.putTasks.mockResolvedValue(undefined);

      await runExternalMigrations(adapter);

      expect(localStorage.getItem(externalMigrationFlagKey)).toBe("completed");
    });

    it("does not throw when migration fails (non-blocking)", async () => {
      localStorage.setItem(
        "compass.today.tasks.2025-01-01",
        "invalid json {{{",
      );

      const adapter = createMockAdapter();

      await expect(runExternalMigrations(adapter)).resolves.not.toThrow();
      expect(localStorage.getItem(externalMigrationFlagKey)).toBeNull();
    });
  });

  describe("runAllMigrations", () => {
    it("runs data then external migrations without error", async () => {
      const adapter = createMockAdapter();
      adapter.getTasks.mockResolvedValue([]);

      await expect(runAllMigrations(adapter)).resolves.toBeUndefined();
      expect(localStorage.getItem(externalMigrationFlagKey)).toBe("completed");
    });
  });
});
