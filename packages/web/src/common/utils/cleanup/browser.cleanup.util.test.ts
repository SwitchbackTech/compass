import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { afterAll } from "bun:test";

const signOut = mock();

mock.module("@web/common/classes/Session", () => ({
  session: {
    signOut,
  },
}));

const { session } =
  require("@web/common/classes/Session") as typeof import("@web/common/classes/Session");
const { clearAllBrowserStorage, hasCompassStorage } =
  require("./browser.cleanup.util") as typeof import("./browser.cleanup.util");

describe("browser.cleanup.util", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    signOut.mockClear();
  });

  describe("hasCompassStorage", () => {
    it("should return false when no Compass storage exists", () => {
      expect(hasCompassStorage()).toBe(false);
    });

    it("should return true when compass. keys exist", () => {
      localStorage.setItem("compass.test", "value");
      expect(hasCompassStorage()).toBe(true);
    });

    it("should return true when compass.today.tasks keys exist", () => {
      localStorage.setItem("compass.today.tasks.2024-01-01", "[]");
      expect(hasCompassStorage()).toBe(true);
    });

    it("should return false for non-Compass keys", () => {
      localStorage.setItem("other.key", "value");
      expect(hasCompassStorage()).toBe(false);
    });
  });

  describe("clearAllBrowserStorage", () => {
    it("should sign out from session", async () => {
      await clearAllBrowserStorage();
      expect(session.signOut).toHaveBeenCalledTimes(1);
    });

    it("should clear all compass. localStorage keys", async () => {
      localStorage.setItem("compass.test1", "value1");
      localStorage.setItem("compass.test2", "value2");
      localStorage.setItem("other.key", "value3");

      await clearAllBrowserStorage();

      expect(localStorage.getItem("compass.test1")).toBeNull();
      expect(localStorage.getItem("compass.test2")).toBeNull();
      expect(localStorage.getItem("other.key")).toBe("value3");
    });

    it("should clear compass.today.tasks localStorage keys", async () => {
      localStorage.setItem("compass.today.tasks.2024-01-01", "[]");
      localStorage.setItem("compass.today.tasks.2024-01-02", "[]");
      localStorage.setItem("other.key", "value");

      await clearAllBrowserStorage();

      expect(localStorage.getItem("compass.today.tasks.2024-01-01")).toBeNull();
      expect(localStorage.getItem("compass.today.tasks.2024-01-02")).toBeNull();
      expect(localStorage.getItem("other.key")).toBe("value");
    });

    it("continues cleanup when sign out fails", async () => {
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("compass.test", "value");

      signOut.mockRejectedValueOnce(new Error("Sign out failed"));

      await expect(clearAllBrowserStorage()).resolves.toBeUndefined();
      expect(localStorage.getItem("compass.test")).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to sign out during browser cleanup:",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it("should not fail when no Compass storage exists", async () => {
      localStorage.setItem("other.key", "value");
      await expect(clearAllBrowserStorage()).resolves.toBeUndefined();
      expect(localStorage.getItem("other.key")).toBe("value");
    });

    describe("IndexedDB deletion", () => {
      let originalIndexedDB: IDBFactory;

      beforeEach(() => {
        originalIndexedDB = window.indexedDB;
      });

      afterEach(() => {
        Object.defineProperty(window, "indexedDB", {
          value: originalIndexedDB,
          writable: true,
          configurable: true,
        });
      });

      it("should delete compass-local IndexedDB when it exists", async () => {
        const mockDeleteRequest = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          onblocked: null as (() => void) | null,
        };

        const mockIndexedDB = {
          databases: mock().mockResolvedValue([
            { name: "compass-local" },
            { name: "other-db" },
          ]),
          deleteDatabase: mock().mockImplementation(() => {
            setTimeout(() => mockDeleteRequest.onsuccess?.(), 0);
            return mockDeleteRequest;
          }),
        };

        Object.defineProperty(window, "indexedDB", {
          value: mockIndexedDB,
          writable: true,
          configurable: true,
        });

        await clearAllBrowserStorage();

        expect(mockIndexedDB.databases).toHaveBeenCalled();
        expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith(
          "compass-local",
        );
      });

      it("should not attempt deletion when compass-local database does not exist", async () => {
        const mockIndexedDB = {
          databases: mock().mockResolvedValue([{ name: "other-db" }]),
          deleteDatabase: mock(),
        };

        Object.defineProperty(window, "indexedDB", {
          value: mockIndexedDB,
          writable: true,
          configurable: true,
        });

        await clearAllBrowserStorage();

        expect(mockIndexedDB.databases).toHaveBeenCalled();
        expect(mockIndexedDB.deleteDatabase).not.toHaveBeenCalled();
      });

      it("should skip IndexedDB cleanup when indexedDB is not available", async () => {
        Object.defineProperty(window, "indexedDB", {
          value: undefined,
          writable: true,
          configurable: true,
        });

        // Should complete without errors
        await expect(clearAllBrowserStorage()).resolves.toBeUndefined();
      });

      it("should handle IndexedDB deletion error", async () => {
        const spy = spyOn(console, "error").mockImplementation(() => {});
        const mockDeleteRequest = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          onblocked: null as (() => void) | null,
        };

        const mockIndexedDB = {
          databases: mock().mockResolvedValue([{ name: "compass-local" }]),
          deleteDatabase: mock().mockImplementation(() => {
            setTimeout(() => mockDeleteRequest.onerror?.(), 0);
            return mockDeleteRequest;
          }),
        };

        Object.defineProperty(window, "indexedDB", {
          value: mockIndexedDB,
          writable: true,
          configurable: true,
        });

        await expect(clearAllBrowserStorage()).rejects.toThrow(
          "Failed to delete IndexedDB",
        );
        spy.mockRestore();
      });

      it("should handle IndexedDB deletion blocked gracefully", async () => {
        const consoleWarnSpy = spyOn(console, "warn").mockImplementation(
          () => {},
        );

        const mockDeleteRequest = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          onblocked: null as (() => void) | null,
        };

        const mockIndexedDB = {
          databases: mock().mockResolvedValue([{ name: "compass-local" }]),
          deleteDatabase: mock().mockImplementation(() => {
            setTimeout(() => mockDeleteRequest.onblocked?.(), 0);
            return mockDeleteRequest;
          }),
        };

        Object.defineProperty(window, "indexedDB", {
          value: mockIndexedDB,
          writable: true,
          configurable: true,
        });

        await expect(clearAllBrowserStorage()).resolves.toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "IndexedDB deletion blocked - close all Compass tabs and try again",
        );

        consoleWarnSpy.mockRestore();
      });
    });
  });
});

afterAll(() => {
  mock.restore();
});
