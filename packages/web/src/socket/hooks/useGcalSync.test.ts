import { useDispatch } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import {
  selectImporting,
  selectIsImportPending,
} from "@web/ducks/events/selectors/sync.selector";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { useAppSelector } from "@web/store/store.hooks";
import { socket } from "../client/socket.client";
import { useGcalSync } from "./useGcalSync";

// Mock dependencies
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));
jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn(),
}));
jest.mock("../client/socket.client", () => ({
  socket: {
    on: jest.fn(),
    removeListener: jest.fn(),
  },
}));
jest.mock("@web/ducks/events/slices/sync.slice", () => ({
  importGCalSlice: {
    actions: {
      importing: jest.fn(),
      clearImportResults: jest.fn(),
      setImportResults: jest.fn(),
      setImportError: jest.fn(),
      request: jest.fn(),
    },
  },
  importLatestSlice: {
    reducer: (state = { isFetchNeeded: false, reason: null }) => state,
    actions: { resetIsFetchNeeded: jest.fn() },
  },
  triggerFetch: jest.fn(),
}));
// Mock shouldImportGCal util
jest.mock("@core/util/event/event.util", () => ({
  shouldImportGCal: jest.fn(() => false),
}));
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    isActive: jest.fn(() => false),
  },
}));
jest.mock("@web/common/utils/auth/google-auth.util", () => ({
  handleGoogleRevoked: jest.fn(),
}));

describe("useGcalSync", () => {
  const mockDispatch = jest.fn();
  const mockUseAppSelector = useAppSelector as jest.MockedFunction<
    typeof useAppSelector
  >;
  let importingValue = false;
  let awaitingValue = false;

  beforeEach(() => {
    jest.clearAllMocks();
    importingValue = false;
    awaitingValue = false;
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) {
        return importingValue;
      }
      if (selector === selectIsImportPending) {
        return awaitingValue;
      }
      return false;
    });
  });

  it("sets up socket listeners", () => {
    renderHook(() => useGcalSync());

    expect(socket.on).toHaveBeenCalledWith(USER_METADATA, expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith(
      IMPORT_GCAL_START,
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      IMPORT_GCAL_END,
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      GOOGLE_REVOKED,
      expect.any(Function),
    );
  });

  describe("GOOGLE_REVOKED", () => {
    it("calls handleGoogleRevoked when socket event fires", () => {
      const {
        handleGoogleRevoked,
      } = require("@web/common/utils/auth/google-auth.util");
      let onGoogleRevoked: (() => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === GOOGLE_REVOKED) {
          onGoogleRevoked = handler;
        }
      });

      renderHook(() => useGcalSync());

      onGoogleRevoked?.();

      expect(handleGoogleRevoked).toHaveBeenCalledTimes(1);
    });
  });

  describe("IMPORT_GCAL_START", () => {
    it("handles import start correctly", () => {
      let importStartHandler: ((importing?: boolean) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === IMPORT_GCAL_START) {
          importStartHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      importStartHandler?.(true);

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.clearImportResults(undefined),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(true),
      );
    });
  });

  describe("IMPORT_GCAL_END", () => {
    it("sets results when awaiting import results", () => {
      awaitingValue = true;

      let importEndHandler: ((data: string) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === IMPORT_GCAL_END) {
          importEndHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      importEndHandler?.(
        JSON.stringify({ eventsCount: 10, calendarsCount: 2 }),
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 10,
          calendarsCount: 2,
        }),
      );
      expect(triggerFetch).toHaveBeenCalledWith({
        reason: "IMPORT_COMPLETE",
      });
    });

    it("does not set results when not awaiting import results", () => {
      awaitingValue = false;

      let importEndHandler: ((data: string) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === IMPORT_GCAL_END) {
          importEndHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      importEndHandler?.(JSON.stringify({ eventsCount: 10 }));

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(importGCalSlice.actions.setImportResults).not.toHaveBeenCalled();
    });

    it("handles import end when awaitingImportResults changes mid-render", () => {
      // Simulate the race condition: starts false, changes to true,
      // then event arrives (testing ref pattern works correctly)

      let importEndHandler: ((data: string) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === IMPORT_GCAL_END) {
          importEndHandler = handler;
        }
      });

      // Start with awaitingImportResults = false
      awaitingValue = false;
      const { rerender } = renderHook(() => useGcalSync());

      // Change to true (simulating user clicking Reconnect)
      awaitingValue = true;
      rerender();

      // Event arrives - should process correctly with ref pattern
      importEndHandler?.(
        JSON.stringify({ eventsCount: 10, calendarsCount: 2 }),
      );

      // Verify setImportResults was called (not skipped due to stale closure)
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 10,
          calendarsCount: 2,
        }),
      );
    });
  });

  describe("import flow interaction", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("shows spinner on import start and hides it on successful import end", () => {
      // Capture socket handlers to simulate backend events
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        handlers[event] = handler;
      });

      awaitingValue = true;
      renderHook(() => useGcalSync());

      // Verify handlers are registered
      expect(handlers[IMPORT_GCAL_START]).toBeDefined();
      expect(handlers[IMPORT_GCAL_END]).toBeDefined();

      // Phase 1: Backend signals import start (spinner should appear)
      handlers[IMPORT_GCAL_START](true);

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.clearImportResults(undefined),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(true),
      );

      mockDispatch.mockClear();

      // Phase 2: Simulate backend processing time (e.g., 2 seconds)
      jest.advanceTimersByTime(2000);

      // Phase 3: Backend signals import complete with successful response
      const successfulResponse = JSON.stringify({
        eventsCount: 25,
        calendarsCount: 3,
      });
      handlers[IMPORT_GCAL_END](successfulResponse);

      // Spinner should disappear (importing set to false)
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      // Results should be set
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 25,
          calendarsCount: 3,
        }),
      );
      // Fetch should be triggered to load new events
      expect(triggerFetch).toHaveBeenCalledWith({
        reason: "IMPORT_COMPLETE",
      });
    });

    it("hides spinner when import completes successfully", () => {
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        handlers[event] = handler;
      });

      awaitingValue = true;
      renderHook(() => useGcalSync());

      // Start import
      handlers[IMPORT_GCAL_START](true);
      mockDispatch.mockClear();

      // Simulate a reasonable import duration (under 30 seconds)
      const REASONABLE_IMPORT_TIME_MS = 15000;
      jest.advanceTimersByTime(REASONABLE_IMPORT_TIME_MS);

      // Import completes successfully
      handlers[IMPORT_GCAL_END](
        JSON.stringify({ eventsCount: 100, calendarsCount: 5 }),
      );

      // Verify spinner is hidden
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
    });

    it("handles rapid start/end sequence without state inconsistency", () => {
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        handlers[event] = handler;
      });

      awaitingValue = true;
      renderHook(() => useGcalSync());

      // Rapid sequence: start → end (small import)
      handlers[IMPORT_GCAL_START](true);
      jest.advanceTimersByTime(100); // Very fast import
      handlers[IMPORT_GCAL_END](
        JSON.stringify({ eventsCount: 2, calendarsCount: 1 }),
      );

      // Verify the correct sequence of actions was dispatched:
      // 1. clearImportResults (on start)
      // 2. importing(true) (on start)
      // 3. importing(false) (on end)
      // 4. setImportResults (on end)
      expect(importGCalSlice.actions.clearImportResults).toHaveBeenCalledWith(
        undefined,
      );
      expect(importGCalSlice.actions.importing).toHaveBeenCalledWith(true);
      expect(importGCalSlice.actions.importing).toHaveBeenCalledWith(false);
      expect(importGCalSlice.actions.setImportResults).toHaveBeenCalledWith({
        eventsCount: 2,
        calendarsCount: 1,
      });
    });

    it("handles import end with empty payload gracefully", () => {
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        handlers[event] = handler;
      });

      awaitingValue = true;
      renderHook(() => useGcalSync());

      handlers[IMPORT_GCAL_START](true);
      mockDispatch.mockClear();

      // Backend sends empty response (edge case)
      handlers[IMPORT_GCAL_END](JSON.stringify({}));

      // Should still hide spinner and set empty results
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({}),
      );
    });

    it("handles import end with object payload (non-string)", () => {
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        handlers[event] = handler;
      });

      awaitingValue = true;
      renderHook(() => useGcalSync());

      handlers[IMPORT_GCAL_START](true);
      mockDispatch.mockClear();

      // Backend sends object directly (alternative format)
      handlers[IMPORT_GCAL_END]({ eventsCount: 50, calendarsCount: 4 });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 50,
          calendarsCount: 4,
        }),
      );
    });

    it("sets error state when backend returns malformed JSON", () => {
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        handlers[event] = handler;
      });
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      awaitingValue = true;
      renderHook(() => useGcalSync());

      handlers[IMPORT_GCAL_START](true);
      mockDispatch.mockClear();

      // Backend sends malformed response
      handlers[IMPORT_GCAL_END]("not valid json {{{");

      // Should hide spinner
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      // Should set error
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportError(
          "Failed to parse Google Calendar import results.",
        ),
      );
      // Should NOT set results
      expect(importGCalSlice.actions.setImportResults).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
