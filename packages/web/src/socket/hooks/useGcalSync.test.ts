import { useDispatch } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  FETCH_USER_METADATA,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { type ImportGCalEndPayload } from "@core/types/websocket.types";
import { handleGoogleRevoked } from "@web/auth/google/google.auth.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
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
      clearImportResults: jest.fn(),
      stopRepair: jest.fn(),
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
      set: jest.fn((payload: unknown) => ({
        type: "userMetadata/set",
        payload,
      })),
      clear: jest.fn(() => ({ type: "userMetadata/clear" })),
    },
  },
}));
jest.mock("@web/auth/google/google.auth.util", () => ({
  handleGoogleRevoked: jest.fn(),
}));
jest.mock("@web/common/utils/toast/error-toast.util", () => ({
  showErrorToast: jest.fn(),
}));

describe("useGcalSync", () => {
  const mockDispatch = jest.fn();
  const mockHandleGoogleRevoked = jest.mocked(handleGoogleRevoked);
  const mockShowErrorToast = showErrorToast as jest.MockedFunction<
    typeof showErrorToast
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  it("sets up socket listeners", () => {
    renderHook(() => useGcalSync());

    expect(socket.on).toHaveBeenCalledWith(USER_METADATA, expect.any(Function));
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
      let onGoogleRevoked: (() => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: () => void) => {
          if (event === GOOGLE_REVOKED) {
            onGoogleRevoked = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      onGoogleRevoked?.();

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.stopRepair(),
      );
      expect(mockHandleGoogleRevoked).toHaveBeenCalledTimes(1);
    });
  });

  describe("USER_METADATA", () => {
    it("updates Redux with server metadata (includes connectionState)", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (metadata: unknown) => void) => {
          if (event === USER_METADATA) {
            metadataHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      metadataHandler?.({
        sync: { importGCal: "IMPORTING" },
        google: { connectionState: "IMPORTING" },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        userMetadataSlice.actions.set({
          sync: { importGCal: "IMPORTING" },
          google: { connectionState: "IMPORTING" },
        }),
      );
    });

    it("requests an import when metadata says restart is needed", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (metadata: unknown) => void) => {
          if (event === USER_METADATA) {
            metadataHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      metadataHandler?.({
        sync: { importGCal: "RESTART" },
        google: { connectionState: "ATTENTION" },
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.request(),
      );
    });

    it("does not auto-request an import when reconnect is required", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (metadata: unknown) => void) => {
          if (event === USER_METADATA) {
            metadataHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      metadataHandler?.({
        sync: { importGCal: "RESTART" },
        google: { connectionState: "RECONNECT_REQUIRED" },
      });

      expect(importGCalSlice.actions.request).not.toHaveBeenCalled();
    });

    it("does not auto-request an import when account is not connected", () => {
      let metadataHandler: ((metadata: unknown) => void) | undefined;
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (metadata: unknown) => void) => {
          if (event === USER_METADATA) {
            metadataHandler = handler;
          }
        },
      );

      renderHook(() => useGcalSync());

      metadataHandler?.({
        sync: { importGCal: "RESTART" },
        google: { connectionState: "NOT_CONNECTED" },
      });

      expect(importGCalSlice.actions.request).not.toHaveBeenCalled();
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
        operation: "REPAIR",
        status: "COMPLETED",
        eventsCount: 10,
        calendarsCount: 2,
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.stopRepair(),
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

    it("does not clear repair state for incremental import completion", () => {
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
        operation: "INCREMENTAL",
        status: "COMPLETED",
        eventsCount: 10,
        calendarsCount: 2,
      });

      expect(importGCalSlice.actions.stopRepair).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 10,
          calendarsCount: 2,
        }),
      );
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
        operation: "REPAIR",
        status: "IGNORED",
        message:
          "User test-user gcal import is in progress or completed, ignoring this request",
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.stopRepair(),
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
        operation: "REPAIR",
        status: "ERRORED",
        message: "Google Calendar repair failed. Please try again.",
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.stopRepair(),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportError(
          "Google Calendar repair failed. Please try again.",
        ),
      );
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Google Calendar repair failed. Please try again.",
        { toastId: "google-repair-failed" },
      );
      expect(socket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
      expect(importGCalSlice.actions.setImportResults).not.toHaveBeenCalled();
    });

    it("does not show a toast for non-repair import errors", () => {
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
        operation: "INCREMENTAL",
        status: "ERRORED",
        message: "Incremental Google Calendar sync failed for user: 123",
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportError(
          "Incremental Google Calendar sync failed for user: 123",
        ),
      );
      expect(importGCalSlice.actions.stopRepair).not.toHaveBeenCalled();
      expect(mockShowErrorToast).not.toHaveBeenCalled();
    });
  });

  describe("import flow interaction", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("processes successful import end and triggers metadata refresh", () => {
      const handlers: Record<string, (...args: unknown[]) => void> = {};
      (socket.on as jest.Mock).mockImplementation(
        (event: string, handler: (...args: unknown[]) => void) => {
          handlers[event] = handler;
        },
      );

      renderHook(() => useGcalSync());

      expect(handlers[IMPORT_GCAL_END]).toBeDefined();

      // Simulate backend processing time
      jest.advanceTimersByTime(2000);

      // Backend signals import complete
      const successfulResponse: ImportGCalEndPayload = {
        operation: "REPAIR",
        status: "COMPLETED",
        eventsCount: 25,
        calendarsCount: 3,
      };
      handlers[IMPORT_GCAL_END](successfulResponse);

      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.stopRepair(),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportResults({
          eventsCount: 25,
          calendarsCount: 3,
        }),
      );
      // Requests fresh metadata which will update connectionState
      expect(socket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
      expect(triggerFetch).toHaveBeenCalledWith({
        reason: "IMPORT_COMPLETE",
      });
    });
  });
});
