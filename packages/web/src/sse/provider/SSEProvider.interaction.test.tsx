import { render, waitFor } from "@testing-library/react";
import { EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { type ServerMessage } from "@core/types/server-message.contracts";
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

// Mirrors sse.client's emit convention: listeners subscribe by the message's
// own `type` and receive the already-parsed ServerMessage (B10).
const fireMessage = (message: ServerMessage) => {
  sseEmitter.emit(message.type, message);
};

const fireUserMetadata = (metadata: UserMetadata) => {
  fireMessage({
    type: "userMetadataChanged",
    metadata: metadata as unknown as Record<string, unknown>,
  });
};

describe("useGcalSSE", () => {
  beforeEach(() => {
    sseEmitter.removeAllListeners();
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

  it("sets the syncing override when syncStatusChanged reports syncing", async () => {
    render(<HookHost />);

    act(() => {
      fireMessage({ type: "syncStatusChanged", sync: { status: "syncing" } });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe("syncing");
    });
  });

  it("clears the syncing override and triggers refetch after importCompleted", async () => {
    setRepairingSyncIndicatorOverride();

    render(<HookHost />);

    act(() => {
      fireMessage({
        type: "importCompleted",
        operation: "repair",
        eventsCount: 4,
        calendarsCount: 1,
      });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockInvalidateEventQueries).toHaveBeenCalled();
    });
  });

  it("clears the syncing override and shows the repair toast on WATCH_REPAIR_FAILED", async () => {
    setRepairingSyncIndicatorOverride();

    render(<HookHost />);

    act(() => {
      fireMessage({
        type: "syncStatusChanged",
        sync: {
          status: "attention",
          code: "WATCH_REPAIR_FAILED",
          retryable: true,
        },
      });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        undefined,
        expect.anything(),
      );
    });
  });

  it("clears the syncing override when Google is revoked", async () => {
    setRepairingSyncIndicatorOverride();

    render(<HookHost />);

    act(() => {
      fireMessage({
        type: "syncStatusChanged",
        sync: { status: "attention", code: "GOOGLE_REVOKED", retryable: false },
      });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockHandleGoogleRevoked).toHaveBeenCalledTimes(1);
    });
  });
});
