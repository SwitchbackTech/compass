import { useDispatch } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { useSession } from "@web/auth/hooks/useSession";
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
jest.mock("@web/auth/hooks/useSession");
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
  const mockSetIsSyncing = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSession as jest.Mock).mockReturnValue({
      isSyncing: false,
      setIsSyncing: mockSetIsSyncing,
    });
    (useAppSelector as jest.Mock).mockReturnValue(false); // Default: not importing
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

      if (importStartHandler!) {
        importStartHandler(true);
      }

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.clearImportResults(undefined),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(true),
      );
    });
  });

  describe("IMPORT_GCAL_END", () => {
    it("handles import end and sets results if syncing", async () => {
      (useSession as jest.Mock).mockReturnValue({
        isSyncing: true,
        setIsSyncing: mockSetIsSyncing,
      });
      // Mock that importing was true (so importStartedRef gets set)
      (useAppSelector as jest.Mock).mockReturnValue(true);

      let importEndHandler: (data: string) => void;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === IMPORT_GCAL_END) {
          importEndHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      // Simulate import end with results
      if (importEndHandler!) {
        importEndHandler(
          JSON.stringify({ eventsCount: 10, calendarsCount: 2 }),
        );
      }

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
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

    it("does not set results if not syncing/importing", () => {
      (useSession as jest.Mock).mockReturnValue({
        isSyncing: false, // Not syncing
        setIsSyncing: mockSetIsSyncing,
      });
      (useAppSelector as jest.Mock).mockReturnValue(false); // Not importing

      let importEndHandler: (data: string) => void;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === IMPORT_GCAL_END) {
          importEndHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      if (importEndHandler!) {
        importEndHandler(JSON.stringify({ eventsCount: 10 }));
      }

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockSetIsSyncing).not.toHaveBeenCalled();
      expect(importGCalSlice.actions.setImportResults).not.toHaveBeenCalled();
    });
  });

  describe("Race Condition (USER_METADATA vs IMPORT_GCAL_END)", () => {
    it("prevents USER_METADATA from closing sync if import started locally", () => {
      (useSession as jest.Mock).mockReturnValue({
        isSyncing: true,
        setIsSyncing: mockSetIsSyncing,
      });
      // Simulating that we are locally importing
      (useAppSelector as jest.Mock).mockReturnValue(true);

      let userMetadataHandler: (data: any) => void;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === USER_METADATA) {
          userMetadataHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      // Simulate USER_METADATA saying "done" (not importing)
      if (userMetadataHandler!) {
        userMetadataHandler({
          sync: { importGCal: "done" },
        });
      }

      // Should NOT close sync because importStartedRef is true (derived from useAppSelector=true)
      expect(mockSetIsSyncing).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
    });

    it("allows USER_METADATA to close sync if import NOT started locally", () => {
      (useSession as jest.Mock).mockReturnValue({
        isSyncing: true,
        setIsSyncing: mockSetIsSyncing,
      });
      // Simulating that we are NOT locally importing
      (useAppSelector as jest.Mock).mockReturnValue(false);

      let userMetadataHandler: (data: any) => void;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === USER_METADATA) {
          userMetadataHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      // Simulate USER_METADATA saying "done"
      if (userMetadataHandler!) {
        userMetadataHandler({
          sync: { importGCal: "done" },
        });
      }

      // Should close sync
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
    });
  });
});
