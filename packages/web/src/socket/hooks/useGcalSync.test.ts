import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  FETCH_USER_METADATA,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { type ImportGCalEndPayload } from "@core/types/websocket.types";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "../client/socket.client";
import { useGcalSync } from "./useGcalSync";

// Mock dependencies
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));
jest.mock("../client/socket.client", () => ({
  socket: {
    emit: jest.fn(),
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
jest.mock("@web/ducks/auth/slices/user-metadata.slice", () => ({
  userMetadataSlice: {
    actions: {
      set: jest.fn((payload) => ({ type: "userMetadata/set", payload })),
      clear: jest.fn(() => ({ type: "userMetadata/clear" })),
    },
  },
}));
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    isActive: jest.fn(() => false),
  },
}));
jest.mock("@web/auth/google/google.auth.util", () => ({
  handleGoogleRevoked: jest.fn(),
}));

describe("useGcalSync", () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
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
      } = require("@web/auth/google/google.auth.util");
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

  describe("USER_METADATA", () => {
    it("syncs importing state with server metadata", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === USER_METADATA) {
          metadataHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      metadataHandler?.({ sync: { importGCal: "IMPORTING" } });

      expect(mockDispatch).toHaveBeenCalledWith(
        userMetadataSlice.actions.set({ sync: { importGCal: "IMPORTING" } }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(true),
      );
    });

    it("sets importing to false when not importing", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === USER_METADATA) {
          metadataHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      metadataHandler?.({ sync: { importGCal: "COMPLETED" } });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
    });

    it("requests an import when metadata says restart is needed", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === USER_METADATA) {
          metadataHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      metadataHandler?.({
        sync: { importGCal: "RESTART" },
        google: { connectionStatus: "CONNECTED" },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.request(undefined as never),
      );
    });

    it("does not auto-request an import when reconnect is required", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation((event, handler) => {
        if (event === USER_METADATA) {
          metadataHandler = handler;
        }
      });

      renderHook(() => useGcalSync());

      metadataHandler?.({
        sync: { importGCal: "RESTART" },
        google: { connectionStatus: "RECONNECT_REQUIRED" },
      });

      expect(importGCalSlice.actions.request).not.toHaveBeenCalled();
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
    it("sets results and triggers fetch on successful import", () => {
      let importEndHandler: ((data?: ImportGCalEndPayload) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (data?: ImportGCalEndPayload) => void) => {
          if (event === IMPORT_GCAL_END) {
            importEndHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      importEndHandler?.({
        status: "COMPLETED",
        eventsCount: 10,
        calendarsCount: 2,
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 10,
          calendarsCount: 2,
        }),
      );
      expect(socket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
      expect(triggerFetch).toHaveBeenCalledWith({
        reason: "IMPORT_COMPLETE",
      });
    });

    it("does not trigger fetch when import is ignored", () => {
      let importEndHandler: ((data?: ImportGCalEndPayload) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (data?: ImportGCalEndPayload) => void) => {
          if (event === IMPORT_GCAL_END) {
            importEndHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      importEndHandler?.({
        status: "IGNORED",
        message:
          "User test-user gcal import is in progress or completed, ignoring this request",
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(socket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
      expect(importGCalSlice.actions.setImportResults).not.toHaveBeenCalled();
      expect(triggerFetch).not.toHaveBeenCalled();
    });

    it("sets error state when backend returns an errored payload", () => {
      let importEndHandler: ((data?: ImportGCalEndPayload) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (data?: ImportGCalEndPayload) => void) => {
          if (event === IMPORT_GCAL_END) {
            importEndHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      importEndHandler?.({
        status: "ERRORED",
        message: "Incremental Google Calendar sync failed for user: test-user",
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportError(
          "Incremental Google Calendar sync failed for user: test-user",
        ),
      );
      expect(socket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
      expect(importGCalSlice.actions.setImportResults).not.toHaveBeenCalled();
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
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (...args: unknown[]) => void) => {
          handlers[event] = handler;
        },
      );

      renderHook(() => useGcalSync());

      expect(handlers[IMPORT_GCAL_START]).toBeDefined();
      expect(handlers[IMPORT_GCAL_END]).toBeDefined();

      // Phase 1: Backend signals import start
      handlers[IMPORT_GCAL_START](true);

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.clearImportResults(undefined),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(true),
      );

      mockDispatch.mockClear();

      // Phase 2: Simulate backend processing time
      jest.advanceTimersByTime(2000);

      // Phase 3: Backend signals import complete
      const successfulResponse: ImportGCalEndPayload = {
        status: "COMPLETED",
        eventsCount: 25,
        calendarsCount: 3,
      };
      handlers[IMPORT_GCAL_END](successfulResponse);

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.importing(false),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 25,
          calendarsCount: 3,
        }),
      );
      expect(socket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
      expect(triggerFetch).toHaveBeenCalledWith({
        reason: "IMPORT_COMPLETE",
      });
    });
  });
});
