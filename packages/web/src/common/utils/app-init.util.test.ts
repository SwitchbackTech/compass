import { toast } from "react-toastify";
import { initializeStorage } from "@web/common/storage/adapter/adapter";
import { DatabaseInitError } from "@web/common/utils/storage/db-errors.util";
import {
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "./app-init.util";

// Mock the storage adapter
jest.mock("@web/common/storage/adapter/adapter", () => ({
  initializeStorage: jest.fn(),
}));

// Mock react-toastify
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockInitializeStorage = initializeStorage as jest.Mock;

describe("app-init.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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
      await expect(
        initializeDatabaseWithErrorHandling(),
      ).resolves.not.toThrow();
    });
  });

  describe("showDbInitErrorToast", () => {
    it("should show error toast with correct message after timeout", () => {
      const dbError = new DatabaseInitError("Storage quota exceeded");

      showDbInitErrorToast(dbError);

      // Toast should not be called immediately
      expect(toast.error).not.toHaveBeenCalled();

      // Fast-forward timers
      jest.advanceTimersByTime(100);

      // Now toast should be called
      expect(toast.error).toHaveBeenCalledWith(
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
      jest.advanceTimersByTime(100);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Database version mismatch"),
        expect.any(Object),
      );
    });

    it("should set autoClose to false so user must dismiss", () => {
      const dbError = new DatabaseInitError("Test error");

      showDbInitErrorToast(dbError);
      jest.advanceTimersByTime(100);

      expect(toast.error).toHaveBeenCalledWith(
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
        jest.advanceTimersByTime(100);

        expect(toast.error).toHaveBeenCalledWith(
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
      jest.advanceTimersByTime(100);
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
