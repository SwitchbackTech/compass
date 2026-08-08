import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  DatabaseInitError,
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "./app-init.util";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

describe("app-init.util", () => {
  const mockInitializeStorage = mock();
  const { port, mocks } = createTestToastPort();

  let rafCallbacks: FrameRequestCallback[];
  let rafSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockInitializeStorage.mockClear();
    mocks.error.mockClear();
    mocks.toast.mockClear();
    registerToastPort(port);
    rafCallbacks = [];
    rafSpy = spyOn(globalThis, "requestAnimationFrame").mockImplementation(((
      callback: FrameRequestCallback,
    ) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame);
  });

  afterEach(() => {
    rafSpy.mockRestore();
  });

  /** Flush both rAF frames used by `showDbInitErrorToast`. */
  const runToastAfterPaint = () => {
    const first = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of first) {
      callback(0);
    }
    const second = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of second) {
      callback(0);
    }
  };

  describe("initializeDatabaseWithErrorHandling", () => {
    it("should return null error when storage initializes successfully", async () => {
      mockInitializeStorage.mockResolvedValue(undefined);

      const result = await initializeDatabaseWithErrorHandling(
        mockInitializeStorage,
      );

      expect(result.dbInitError).toBeNull();
      expect(mockInitializeStorage).toHaveBeenCalledTimes(1);
    });

    it("should catch DatabaseInitError and return it", async () => {
      const dbError = new DatabaseInitError("Storage quota exceeded");
      mockInitializeStorage.mockRejectedValue(dbError);

      const result = await initializeDatabaseWithErrorHandling(
        mockInitializeStorage,
      );

      expect(result.dbInitError).toBeInstanceOf(DatabaseInitError);
      expect(result.dbInitError?.message).toBe("Storage quota exceeded");
    });

    it("should ignore non-DatabaseInitError errors and return null", async () => {
      const genericError = new Error("Some other error");
      mockInitializeStorage.mockRejectedValue(genericError);

      const result = await initializeDatabaseWithErrorHandling(
        mockInitializeStorage,
      );

      expect(result.dbInitError).toBeNull();
    });

    it("should not throw when storage initialization fails", async () => {
      const dbError = new DatabaseInitError("Database version mismatch");
      mockInitializeStorage.mockRejectedValue(dbError);

      await expect(
        initializeDatabaseWithErrorHandling(mockInitializeStorage),
      ).resolves.toEqual({
        dbInitError: dbError,
      });
    });
  });

  describe("showDbInitErrorToast", () => {
    it("should show error toast with correct message after paint", () => {
      const dbError = new DatabaseInitError("Storage quota exceeded");

      showDbInitErrorToast(dbError);

      expect(mocks.error).not.toHaveBeenCalled();

      runToastAfterPaint();

      expect(mocks.error).toHaveBeenCalledWith(
        "Compass can't use offline storage right now: Storage quota exceeded. Your changes won't be saved on this device.",
        {
          autoClose: false,
          position: "bottom-right",
        },
      );
    });

    it("should include the error message in the toast", () => {
      const dbError = new DatabaseInitError("Database version mismatch");

      showDbInitErrorToast(dbError);
      runToastAfterPaint();

      expect(mocks.error).toHaveBeenCalledWith(
        expect.stringContaining("Database version mismatch"),
        expect.any(Object),
      );
    });

    it("should set autoClose to false so user must dismiss", () => {
      const dbError = new DatabaseInitError("Test error");

      showDbInitErrorToast(dbError);
      runToastAfterPaint();

      expect(mocks.error).toHaveBeenCalledWith(
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

      const { dbInitError } = await initializeDatabaseWithErrorHandling(
        mockInitializeStorage,
      );

      expect(dbInitError).not.toBeNull();

      if (dbInitError) {
        showDbInitErrorToast(dbInitError);
        runToastAfterPaint();

        expect(mocks.error).toHaveBeenCalledWith(
          "Compass can't use offline storage right now: Failed to initialize IndexedDB after 3 attempts. Your changes won't be saved on this device.",
          expect.objectContaining({
            autoClose: false,
            position: "bottom-right",
          }),
        );
      }
    });

    it("should handle full initialization flow without error", async () => {
      mockInitializeStorage.mockResolvedValue(undefined);

      const { dbInitError } = await initializeDatabaseWithErrorHandling(
        mockInitializeStorage,
      );

      expect(dbInitError).toBeNull();

      runToastAfterPaint();
      expect(mocks.error).not.toHaveBeenCalled();
    });
  });
});
