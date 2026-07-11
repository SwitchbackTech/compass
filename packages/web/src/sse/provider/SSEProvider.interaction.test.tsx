import { render, waitFor } from "@testing-library/react";
import { EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import {
  getGoogleSyncIndicatorOverride,
  resetGoogleSyncUIStateForTests,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import {
  userMetadataActions,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { createUseGcalSSE } from "../hooks/useGcalSSE.factory";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// TODO(packet-03-phase-3): these string literals stand in for the retired
// IMPORT_GCAL_START/END, GOOGLE_REVOKED, and USER_METADATA SSE constants
// (B10 replaces them with syncStatusChanged/importCompleted/
// userMetadataChanged messages on a single "message" event). This test
// still drives the emitter directly with the old names so it compiles;
// rewrite it against the new ServerMessage shapes.
const IMPORT_GCAL_START = "syncStatusChanged";
const IMPORT_GCAL_END = "importCompleted";
const GOOGLE_REVOKED = "syncStatusChanged";
const USER_METADATA = "userMetadataChanged";

const mockHandleGoogleRevoked = mock();
const mockInvalidateEventQueries = mock();
const mockShowErrorToast = mock();
const refreshUserMetadata = mock().mockResolvedValue(undefined);
const sseEmitter = new EventEmitter2({ maxListeners: 20 });

const useGcalSSE = createUseGcalSSE({
  handleGoogleRevoked: mockHandleGoogleRevoked,
  invalidateEventQueries: mockInvalidateEventQueries,
  refreshUserMetadata,
  setUserMetadata: userMetadataActions.set,
  showErrorToast: mockShowErrorToast,
  sseEmitter,
});

const HookHost = () => {
  useGcalSSE();
  return null;
};

const getSseEmitter = () => {
  return sseEmitter;
};

const fireImportStart = () => {
  getSseEmitter().emit(IMPORT_GCAL_START, new MessageEvent(IMPORT_GCAL_START));
};

const fireImportEnd = (payload: ImportGCalEndPayload) => {
  getSseEmitter().emit(
    IMPORT_GCAL_END,
    new MessageEvent(IMPORT_GCAL_END, { data: JSON.stringify(payload) }),
  );
};

const fireUserMetadata = (metadata: UserMetadata) => {
  getSseEmitter().emit(
    USER_METADATA,
    new MessageEvent(USER_METADATA, { data: JSON.stringify(metadata) }),
  );
};

describe("useGcalSSE", () => {
  beforeEach(() => {
    getSseEmitter().removeAllListeners();
    mockHandleGoogleRevoked.mockClear();
    mockInvalidateEventQueries.mockClear();
    mockShowErrorToast.mockClear();
    refreshUserMetadata.mockClear();
    resetGoogleSyncUIStateForTests();
  });

  it("does not trigger a client-side import when USER_METADATA reports RESTART", () => {
    render(<HookHost />);

    act(() => {
      fireUserMetadata({
        google: { connectionState: "ATTENTION" },
        sync: { importGCal: "RESTART" },
      });
    });

    expect(useUserMetadataStore.getState().current).toEqual({
      google: { connectionState: "ATTENTION" },
      sync: { importGCal: "RESTART" },
    });
  });

  it("stores IMPORTING metadata without starting another import", () => {
    render(<HookHost />);

    act(() => {
      fireUserMetadata({
        google: { connectionState: "IMPORTING" },
        sync: { importGCal: "IMPORTING" },
      });
    });

    expect(useUserMetadataStore.getState().current).toEqual({
      google: { connectionState: "IMPORTING" },
      sync: { importGCal: "IMPORTING" },
    });
  });

  it("sets the syncing override when IMPORT_GCAL_START arrives", async () => {
    render(<HookHost />);

    act(() => {
      fireImportStart();
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe("syncing");
    });
  });

  it("clears the syncing override and triggers refetch after REPAIR completion", async () => {
    setRepairingSyncIndicatorOverride();

    render(<HookHost />);

    act(() => {
      fireImportEnd({
        operation: "REPAIR",
        status: "COMPLETED",
        eventsCount: 4,
        calendarsCount: 1,
      });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockInvalidateEventQueries).toHaveBeenCalled();
    });
  });

  it("clears the syncing override and shows the repair toast after REPAIR failure", async () => {
    setRepairingSyncIndicatorOverride();

    render(<HookHost />);

    act(() => {
      fireImportEnd({
        operation: "REPAIR",
        status: "ERRORED",
        message: "Google Calendar repair failed",
      });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Google Calendar repair failed",
        expect.anything(),
      );
    });
  });

  it("clears the syncing override when Google is revoked", async () => {
    setRepairingSyncIndicatorOverride();

    render(<HookHost />);

    act(() => {
      getSseEmitter().emit(GOOGLE_REVOKED, new MessageEvent(GOOGLE_REVOKED));
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockHandleGoogleRevoked).toHaveBeenCalledTimes(1);
    });
  });
});
