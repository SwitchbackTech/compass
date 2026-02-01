import { toast } from "react-toastify";
import {
  DatabaseInitError,
  initializeDatabase,
} from "@web/common/utils/storage/db-init.util";
import {
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "./app-init.util";

// Mock the db-init module
jest.mock("@web/common/utils/storage/db-init.util", () => {
  const actual = jest.requireActual("@web/common/utils/storage/db-init.util");
  const { DatabaseInitError } = jest.requireActual(
    "@web/common/utils/storage/db-errors.util",
  );
  return {
    ...actual,
    DatabaseInitError,
    initializeDatabase: jest.fn(),
  };
});

// Mock react-toastify
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockInitializeDatabase = initializeDatabase as jest.Mock;

describe("app-init.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initializeDatabaseWithErrorHandling", () => {
    it("should return null error when database initializes successfully", async () => {
      mockInitializeDatabase.mockResolvedValue(undefined);

      const result = await initializeDatabaseWithErrorHandling();

      expect(result.dbInitError).toBeNull();
      expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
    });

    it("should catch DatabaseInitError and return it", async () => {
      const dbError = new DatabaseInitError("Storage quota exceeded");
      mockInitializeDatabase.mockRejectedValue(dbError);

      const result = await initializeDatabaseWithErrorHandling();

      expect(result.dbInitError).toBeInstanceOf(DatabaseInitError);
      expect(result.dbInitError?.message).toBe("Storage quota exceeded");
    });

    it("should ignore non-DatabaseInitError errors and return null", async () => {
      const genericError = new Error("Some other error");
      mockInitializeDatabase.mockRejectedValue(genericError);

      const result = await initializeDatabaseWithErrorHandling();

      expect(result.dbInitError).toBeNull();
    });

    it("should not throw when database initialization fails", async () => {
      const dbError = new DatabaseInitError("Database version mismatch");
      mockInitializeDatabase.mockRejectedValue(dbError);

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
      mockInitializeDatabase.mockRejectedValue(dbError);

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
      mockInitializeDatabase.mockResolvedValue(undefined);

      const { dbInitError } = await initializeDatabaseWithErrorHandling();

      expect(dbInitError).toBeNull();

      // No toast should be shown
      jest.advanceTimersByTime(100);
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
