/**
 * Tests for the storage adapter factory and initialization.
 */
import {
  ensureStorageReady,
  getStorageAdapter,
  initializeStorage,
  isStorageReady,
  resetStorage,
} from "@web/common/storage/adapter/adapter";
import { IndexedDBAdapter } from "@web/common/storage/adapter/indexeddb.adapter";

describe("storage adapter index", () => {
  beforeEach(() => {
    resetStorage();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetStorage();
  });

  describe("getStorageAdapter", () => {
    it("returns the same adapter instance on multiple calls", () => {
      const adapter1 = getStorageAdapter();
      const adapter2 = getStorageAdapter();

      expect(adapter1).toBe(adapter2);
    });

    it("returns a new adapter after resetStorage", () => {
      const adapter1 = getStorageAdapter();
      resetStorage();
      const adapter2 = getStorageAdapter();

      expect(adapter1).not.toBe(adapter2);
    });
  });

  describe("isStorageReady", () => {
    it("returns false before initialization", () => {
      expect(isStorageReady()).toBe(false);
    });

    it("returns true after initializeStorage", async () => {
      await initializeStorage();

      expect(isStorageReady()).toBe(true);
    });

    it("returns false after resetStorage", async () => {
      await initializeStorage();
      resetStorage();

      expect(isStorageReady()).toBe(false);
    });
  });

  describe("initializeStorage", () => {
    it("initializes the adapter and runs migrations", async () => {
      await initializeStorage();

      expect(isStorageReady()).toBe(true);
    });

    it("returns same promise when called multiple times before resolve", async () => {
      const [result1, result2] = await Promise.all([
        initializeStorage(),
        initializeStorage(),
      ]);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(isStorageReady()).toBe(true);
    });

    it("does not re-initialize when already ready", async () => {
      await initializeStorage();
      const adapterBefore = getStorageAdapter();
      await initializeStorage();
      const adapterAfter = getStorageAdapter();

      expect(adapterBefore).toBe(adapterAfter);
    });

    it("allows retry after initialization failure", async () => {
      const initializeSpy = jest
        .spyOn(IndexedDBAdapter.prototype, "initialize")
        .mockRejectedValueOnce(new Error("init failed"))
        .mockResolvedValueOnce(undefined);

      try {
        await expect(initializeStorage()).rejects.toThrow("init failed");
        await expect(initializeStorage()).resolves.toBeUndefined();

        expect(initializeSpy).toHaveBeenCalledTimes(2);
      } finally {
        initializeSpy.mockRestore();
      }
    });
  });

  describe("ensureStorageReady", () => {
    it("triggers initialization when storage is not ready", async () => {
      await ensureStorageReady();

      expect(isStorageReady()).toBe(true);
    });

    it("resolves when storage is already ready", async () => {
      await initializeStorage();

      await expect(ensureStorageReady()).resolves.toBeUndefined();
      expect(isStorageReady()).toBe(true);
    });
  });

  describe("resetStorage", () => {
    it("clears adapter and init promise", async () => {
      await initializeStorage();
      expect(isStorageReady()).toBe(true);

      resetStorage();

      expect(isStorageReady()).toBe(false);
      const newAdapter = getStorageAdapter();
      expect(newAdapter).toBeDefined();
    });
  });
});
