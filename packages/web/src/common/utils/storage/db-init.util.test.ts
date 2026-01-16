import Dexie from "dexie";
import { compassLocalDB } from "./compass-local.db";
import {
  DatabaseInitError,
  ensureDatabaseReady,
  initializeDatabase,
  isDatabaseReady,
  resetDatabaseInitialization,
} from "./db-init.util";

// Mock the compassLocalDB
jest.mock("./compass-local.db", () => ({
  compassLocalDB: {
    open: jest.fn(),
    isOpen: jest.fn(),
    name: "compass-local",
    verno: 1,
    tables: [{ name: "events" }],
  },
}));

describe("db-init.util", () => {
  beforeEach(() => {
    // Reset initialization state before each test
    resetDatabaseInitialization();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetDatabaseInitialization();
    jest.clearAllMocks();
  });

  describe("initializeDatabase", () => {
    it("should successfully initialize the database", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      await initializeDatabase();

      expect(compassLocalDB.open).toHaveBeenCalled();
      expect(compassLocalDB.isOpen).toHaveBeenCalled();
    });

    it("should only initialize once when called multiple times concurrently", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      // Call multiple times concurrently
      await Promise.all([
        initializeDatabase(),
        initializeDatabase(),
        initializeDatabase(),
      ]);

      // Should only call open once
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);
    });

    it("should return immediately if already initialized", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      // Initialize once
      await initializeDatabase();
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);

      // Call again
      await initializeDatabase();

      // Should not call open again
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);
    });

    it("should throw DatabaseInitError if database fails to open", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(false);

      const promise = initializeDatabase();

      await expect(promise).rejects.toThrow(DatabaseInitError);
      await expect(promise).rejects.toThrow(
        "Failed to initialize IndexedDB after 3 attempts",
      );
    });

    it("should retry on transient errors", async () => {
      (compassLocalDB.open as jest.Mock)
        .mockRejectedValueOnce(new Error("Transient error"))
        .mockResolvedValueOnce(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      await initializeDatabase();

      // Should have retried and succeeded
      expect(compassLocalDB.open).toHaveBeenCalledTimes(2);
    });

    it("should throw DatabaseInitError after max retries", async () => {
      (compassLocalDB.open as jest.Mock).mockRejectedValue(
        new Error("Persistent error"),
      );

      const promise = initializeDatabase();

      await expect(promise).rejects.toThrow(DatabaseInitError);
      await expect(promise).rejects.toThrow(
        "Failed to initialize IndexedDB after 3 attempts",
      );

      // Should have retried 3 times
      expect(compassLocalDB.open).toHaveBeenCalledTimes(3);
    });

    it("should handle QuotaExceededError", async () => {
      const quotaError = new Dexie.QuotaExceededError();
      (compassLocalDB.open as jest.Mock).mockRejectedValue(quotaError);

      const promise = initializeDatabase();

      await expect(promise).rejects.toThrow(DatabaseInitError);
      await expect(promise).rejects.toThrow("Storage quota exceeded");

      // Should not retry on quota errors
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);
    });

    it("should handle VersionError", async () => {
      const versionError = new Dexie.VersionError();
      (compassLocalDB.open as jest.Mock).mockRejectedValue(versionError);

      const promise = initializeDatabase();

      await expect(promise).rejects.toThrow(DatabaseInitError);
      await expect(promise).rejects.toThrow("Database version mismatch");

      // Should not retry on version errors
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);
    });
  });

  describe("isDatabaseReady", () => {
    it("should return false before initialization", () => {
      expect(isDatabaseReady()).toBe(false);
    });

    it("should return true after successful initialization", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      await initializeDatabase();

      expect(isDatabaseReady()).toBe(true);
    });

    it("should return false if database is not open", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(false);

      expect(isDatabaseReady()).toBe(false);
    });
  });

  describe("ensureDatabaseReady", () => {
    it("should initialize database if not ready", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      await ensureDatabaseReady();

      expect(compassLocalDB.open).toHaveBeenCalled();
    });

    it("should not reinitialize if already ready", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      // Initialize first
      await initializeDatabase();
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);

      // Ensure ready again
      await ensureDatabaseReady();

      // Should not call open again
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);
    });
  });

  describe("resetDatabaseInitialization", () => {
    it("should reset initialization state", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      // Initialize
      await initializeDatabase();
      expect(isDatabaseReady()).toBe(true);

      // Reset
      resetDatabaseInitialization();
      expect(isDatabaseReady()).toBe(false);
    });

    it("should allow reinitialization after reset", async () => {
      (compassLocalDB.open as jest.Mock).mockResolvedValue(undefined);
      (compassLocalDB.isOpen as jest.Mock).mockReturnValue(true);

      // Initialize
      await initializeDatabase();
      expect(compassLocalDB.open).toHaveBeenCalledTimes(1);

      // Reset and initialize again
      resetDatabaseInitialization();
      await initializeDatabase();

      expect(compassLocalDB.open).toHaveBeenCalledTimes(2);
    });
  });
});
