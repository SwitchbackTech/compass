/**
 * Tests for the database initialization compatibility layer.
 *
 * The db-init.util module now delegates to the storage adapter.
 * These tests verify the delegation works correctly.
 */
import {
  ensureStorageReady,
  initializeStorage,
  isStorageReady,
  resetStorage,
} from "@web/common/storage/adapter";
import {
  ensureDatabaseReady,
  initializeDatabase,
  isDatabaseReady,
  resetDatabaseInitialization,
} from "./db-init.util";

// Mock the storage adapter
jest.mock("@web/common/storage/adapter", () => ({
  initializeStorage: jest.fn(),
  ensureStorageReady: jest.fn(),
  isStorageReady: jest.fn(),
  resetStorage: jest.fn(),
}));

describe("db-init.util (compatibility layer)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initializeDatabase", () => {
    it("should delegate to initializeStorage", async () => {
      (initializeStorage as jest.Mock).mockResolvedValue(undefined);

      await initializeDatabase();

      expect(initializeStorage).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors from initializeStorage", async () => {
      const error = new Error("Storage init failed");
      (initializeStorage as jest.Mock).mockRejectedValue(error);

      await expect(initializeDatabase()).rejects.toThrow("Storage init failed");
    });
  });

  describe("isDatabaseReady", () => {
    it("should delegate to isStorageReady", () => {
      (isStorageReady as jest.Mock).mockReturnValue(true);

      expect(isDatabaseReady()).toBe(true);
      expect(isStorageReady).toHaveBeenCalledTimes(1);
    });

    it("should return false when storage is not ready", () => {
      (isStorageReady as jest.Mock).mockReturnValue(false);

      expect(isDatabaseReady()).toBe(false);
    });
  });

  describe("ensureDatabaseReady", () => {
    it("should delegate to ensureStorageReady", async () => {
      (ensureStorageReady as jest.Mock).mockResolvedValue(undefined);

      await ensureDatabaseReady();

      expect(ensureStorageReady).toHaveBeenCalledTimes(1);
    });
  });

  describe("resetDatabaseInitialization", () => {
    it("should delegate to resetStorage", () => {
      resetDatabaseInitialization();

      expect(resetStorage).toHaveBeenCalledTimes(1);
    });
  });
});
