import { DatabaseInitError } from "@web/common/utils/storage/db-errors.util";
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

// Mock the storage adapter
const mockInitializeStorage = mock();
const mockToastError = mock();

mock.module("@web/common/storage/adapter/adapter", () => ({
  initializeStorage: mockInitializeStorage,
}));

// Mock react-toastify
mock.module("react-toastify", () => ({
  toast: {
    error: mockToastError,
  },
}));

const { initializeDatabaseWithErrorHandling, showDbInitErrorToast } =
  require("./app-init.util") as typeof import("./app-init.util");

describe("app-init.util", () => {
  const timeoutId = {} as ReturnType<typeof setTimeout>;
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let timeoutCallback: (() => void) | undefined;

  beforeEach(() => {
    mockInitializeStorage.mockClear();
    mockToastError.mockClear();
    timeoutCallback = undefined;
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        timeoutCallback = () => callback();
      }
      return timeoutId;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  const runToastTimeout = () => {
    timeoutCallback?.();
  };

  describe("initializeDatabaseWithErrorHandling", () => {
    it("should return null error when storage initializes successfully", async () => {
      mockInitializeStorage.mockResolvedValue(undefined);

      const result = await initializeDatabaseWithErrorHandling();

      expect(result.dbInitError).toBeNull();
      expect(mockInitializeStorage).toHaveBeenCalledTimes(1);
    });

    it("should catch DatabaseInitError and return it", async () => {
      const dbError = new DatabaseInitError("Storage quota exceeded");
      mockInitializeStorage.mockRejectedValue(dbError);

      const result = await initializeDatabaseWithErrorHandling();

      expect(result.dbInitError).toBeInstanceOf(DatabaseInitError);
      expect(result.dbInitError?.message).toBe("Storage quota exceeded");
    });

    it("should ignore non-DatabaseInitError errors and return null", async () => {
      const genericError = new Error("Some other error");
      mockInitializeStorage.mockRejectedValue(genericError);

      const result = await initializeDatabaseWithErrorHandling();

      expect(result.dbInitError).toBeNull();
    });

    it("should not throw when storage initialization fails", async () => {
      const dbError = new DatabaseInitError("Database version mismatch");
      mockInitializeStorage.mockRejectedValue(dbError);

      // Should not throw - just return the error
      await expect(initializeDatabaseWithErrorHandling()).resolves.toEqual({
        dbInitError: dbError,
      });
    });
  });

  describe("showDbInitErrorToast", () => {
    it("should show error toast with correct message after timeout", () => {
      const dbError = new DatabaseInitError("Storage quota exceeded");

      showDbInitErrorToast(dbError);

      // Toast should not be called immediately
      expect(mockToastError).not.toHaveBeenCalled();

      runToastTimeout();

      // Now toast should be called
      expect(mockToastError).toHaveBeenCalledWith(
        "Offline storage unavailable: Storage quota exceeded. Your data will not be saved locally.",
        {
          autoClose: false,
          position: "bottom-right",
        },
      );
    });

    it("should include the error message in the toast", () => {
      const dbError = new DatabaseInitError("Database version mismatch");

      showDbInitErrorToast(dbError);
      runToastTimeout();

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("Database version mismatch"),
        expect.any(Object),
      );
    });

    it("should set autoClose to false so user must dismiss", () => {
      const dbError = new DatabaseInitError("Test error");

      showDbInitErrorToast(dbError);
      runToastTimeout();

      expect(mockToastError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ autoClose: false }),
      );
    });
  });

  describe("integration", () => {
    it("should handle full initialization flow with error", async () => {
      const dbError = new DatabaseInitError(
        "Failed to initialize IndexedDB after 3 attempts",
      );
      mockInitializeStorage.mockRejectedValue(dbError);

      // Simulate what index.tsx does
      const { dbInitError } = await initializeDatabaseWithErrorHandling();

      expect(dbInitError).not.toBeNull();

      if (dbInitError) {
        showDbInitErrorToast(dbInitError);
        runToastTimeout();

        expect(mockToastError).toHaveBeenCalledWith(
          "Offline storage unavailable: Failed to initialize IndexedDB after 3 attempts. Your data will not be saved locally.",
          expect.objectContaining({
            autoClose: false,
            position: "bottom-right",
          }),
        );
      }
    });

    it("should handle full initialization flow without error", async () => {
      mockInitializeStorage.mockResolvedValue(undefined);

      const { dbInitError } = await initializeDatabaseWithErrorHandling();

      expect(dbInitError).toBeNull();

      // No toast should be shown
      runToastTimeout();
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  mock.restore();
});
