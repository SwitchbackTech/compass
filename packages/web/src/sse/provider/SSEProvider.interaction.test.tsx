import { configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { Provider } from "react-redux";
import {
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import {
  getGoogleSyncIndicatorOverride,
  resetGoogleSyncUIStateForTests,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { createUseGcalSSE } from "../hooks/useGcalSSE.factory";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockHandleGoogleRevoked = mock();
const mockInvalidateEventQueries = mock();
const mockShowErrorToast = mock();
const refreshUserMetadata = mock().mockResolvedValue(undefined);
const sseEmitter = new EventEmitter2({ maxListeners: 20 });
let dispatch: (action: unknown) => unknown;

const useGcalSSE = createUseGcalSSE({
  handleGoogleRevoked: mockHandleGoogleRevoked,
  invalidateEventQueries: mockInvalidateEventQueries,
  refreshUserMetadata,
  showErrorToast: mockShowErrorToast,
  sseEmitter,
  useAppDispatch: () => dispatch,
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
  const createStore = () =>
    configureStore({
      reducer: {
        userMetadata: userMetadataSlice.reducer,
      },
    });

  beforeEach(() => {
    getSseEmitter().removeAllListeners();
    mockHandleGoogleRevoked.mockClear();
    mockInvalidateEventQueries.mockClear();
    mockShowErrorToast.mockClear();
    refreshUserMetadata.mockClear();
    resetGoogleSyncUIStateForTests();
  });

  it("does not trigger a client-side import when USER_METADATA reports RESTART", () => {
    const store = createStore();
    dispatch = store.dispatch;

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

    act(() => {
      fireUserMetadata({
        google: { connectionState: "ATTENTION" },
        sync: { importGCal: "RESTART" },
      });
    });

    expect(store.getState().userMetadata.current).toEqual({
      google: { connectionState: "ATTENTION" },
      sync: { importGCal: "RESTART" },
    });
  });

  it("stores IMPORTING metadata without starting another import", () => {
    const store = createStore();
    dispatch = store.dispatch;

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

    act(() => {
      fireUserMetadata({
        google: { connectionState: "IMPORTING" },
        sync: { importGCal: "IMPORTING" },
      });
    });

    expect(store.getState().userMetadata.current).toEqual({
      google: { connectionState: "IMPORTING" },
      sync: { importGCal: "IMPORTING" },
    });
  });

  it("sets the syncing override when IMPORT_GCAL_START arrives", async () => {
    const store = createStore();
    dispatch = store.dispatch;

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

    act(() => {
      fireImportStart();
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe("syncing");
    });
  });

  it("clears the syncing override and triggers refetch after REPAIR completion", async () => {
    const store = createStore();
    dispatch = store.dispatch;
    setRepairingSyncIndicatorOverride();

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

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
    const store = createStore();
    dispatch = store.dispatch;
    setRepairingSyncIndicatorOverride();

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

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
    const store = createStore();
    dispatch = store.dispatch;
    setRepairingSyncIndicatorOverride();

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

    act(() => {
      getSseEmitter().emit(GOOGLE_REVOKED, new MessageEvent(GOOGLE_REVOKED));
    });

    await waitFor(() => {
      expect(getGoogleSyncIndicatorOverride()).toBe(null);
      expect(mockHandleGoogleRevoked).toHaveBeenCalledTimes(1);
    });
  });
});
