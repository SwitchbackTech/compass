import { useDispatch } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import {
  selectAwaitingImportResults,
  selectImporting,
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
  triggerFetch: jest.fn(),
}));
// Mock shouldImportGCal util
jest.mock("@core/util/event/event.util", () => ({
  shouldImportGCal: jest.fn(() => false),
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
      if (selector === selectAwaitingImportResults) {
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
  });

  describe("IMPORT_GCAL_START", () => {
    it("handles import start correctly", () => {
      let importStartHandler: (importing?: boolean) => void;
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

      let importEndHandler: (data: string) => void;
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

      let importEndHandler: (data: string) => void;
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

      let importEndHandler: (data: string) => void;
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
});
