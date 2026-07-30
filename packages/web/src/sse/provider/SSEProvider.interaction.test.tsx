import { render, waitFor } from "@testing-library/react";
import { act } from "react";
import { type UserMetadata } from "@core/types/user.types";
import { createFakeServerMessageBus } from "@web/__tests__/utils/sse-message-bus.test.util";
import {
  getGoogleSyncIndicatorOverride,
  resetGoogleSyncUIStateForTests,
  setSyncingSyncIndicatorOverride,
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

const {
  onServerMessage,
  emit: fireMessage,
  clear,
} = createFakeServerMessageBus();

const useGcalSSE = createUseGcalSSE({
  handleGoogleRevoked: mockHandleGoogleRevoked,
  invalidateEventQueries: mockInvalidateEventQueries,
  onServerMessage,
  refreshUserMetadata,
  setUserMetadata: userMetadataActions.set,
  showErrorToast: mockShowErrorToast,
});

const HookHost = () => {
  useGcalSSE();
  return null;
};

const fireUserMetadata = (metadata: UserMetadata) => {
  fireMessage({
    type: "userMetadataChanged",
    metadata: metadata as unknown as Record<string, unknown>,
  });
};

describe("useGcalSSE", () => {
  beforeEach(() => {
    clear();
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

  it("clears a stale syncing override when replayed metadata is healthy", async () => {
    render(<HookHost />);

    act(() => {
      fireMessage({ type: "syncStatusChanged", sync: { status: "syncing" } });
      fireUserMetadata({ google: { connectionState: "HEALTHY" } });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
    });
  });

  it("clears a stale syncing override when replayed metadata needs attention", async () => {
    render(<HookHost />);

    act(() => {
      fireMessage({ type: "syncStatusChanged", sync: { status: "syncing" } });
      fireUserMetadata({ google: { connectionState: "ATTENTION" } });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
    });
  });

  it("keeps the syncing override when replayed metadata confirms active work", async () => {
    render(<HookHost />);

    act(() => {
      fireMessage({ type: "syncStatusChanged", sync: { status: "syncing" } });
      fireUserMetadata({ google: { connectionState: "IMPORTING" } });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe("syncing");
    });
  });

  it("refetches metadata and events after importCompleted without clearing syncing", async () => {
    setSyncingSyncIndicatorOverride();

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
      // importCompleted alone never clears the override; only metadata that
      // leaves IMPORTING (or an attention/healthy syncStatusChanged) does.
      expect(getGoogleSyncIndicatorOverride()).toBe("syncing");
      expect(refreshUserMetadata).toHaveBeenCalled();
      expect(mockInvalidateEventQueries).toHaveBeenCalled();
    });
  });

  it("refetches metadata on calendarsChanged so Sync connection health can land", async () => {
    render(<HookHost />);

    act(() => {
      fireMessage({ type: "calendarsChanged", calendarIds: [] });
    });

    await waitFor(() => {
      expect(refreshUserMetadata).toHaveBeenCalled();
    });
  });

  it("refetches metadata on healthy syncStatusChanged instead of clearing locally", async () => {
    render(<HookHost />);

    act(() => {
      fireMessage({ type: "syncStatusChanged", sync: { status: "syncing" } });
      fireMessage({ type: "syncStatusChanged", sync: { status: "healthy" } });
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe("syncing");
      expect(refreshUserMetadata).toHaveBeenCalled();
    });
  });

  it("clears the syncing override and shows the repair toast on WATCH_REPAIR_FAILED", async () => {
    setSyncingSyncIndicatorOverride();

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
    setSyncingSyncIndicatorOverride();

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
