import { type EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import {
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import {
  getIsRepairRequested,
  markRepairRequested,
  resetGoogleSyncUIStateForTests,
} from "@web/auth/google/google-sync-ui.state";
import { handleGoogleRevoked } from "@web/auth/google/google.auth.util";
import { SyncApi } from "@web/common/apis/sync.api";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { importLatestSlice } from "@web/ducks/events/slices/sync.slice";
import { useGcalSSE } from "../hooks/useGcalSSE";

jest.mock("@web/auth/google/google.auth.util", () => ({
  handleGoogleRevoked: jest.fn(),
}));
jest.mock("@web/auth/user/util/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@web/common/utils/toast/error-toast.util", () => ({
  showErrorToast: jest.fn(),
}));
jest.mock("../client/sse.client", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const { EventEmitter2 } = require("eventemitter2");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const sseEmitter = new EventEmitter2({ maxListeners: 20 });
  return {
    openStream: jest.fn(),
    closeStream: jest.fn(),
    getStream: jest.fn(() => null),
    sseEmitter: sseEmitter as unknown as EventEmitter2,
  };
});

const mockHandleGoogleRevoked = handleGoogleRevoked as jest.MockedFunction<
  typeof handleGoogleRevoked
>;
const mockShowErrorToast = showErrorToast as jest.MockedFunction<
  typeof showErrorToast
>;
const mockSyncApi = SyncApi as jest.Mocked<typeof SyncApi>;

const HookHost = () => {
  useGcalSSE();
  return null;
};

const getSseEmitter = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("../client/sse.client") as { sseEmitter: EventEmitter2 })
    .sseEmitter;
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
        sync: combineReducers({
          importLatest: importLatestSlice.reducer,
        }),
        userMetadata: userMetadataSlice.reducer,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    resetGoogleSyncUIStateForTests();
    mockSyncApi.importGCal.mockResolvedValue(undefined);
  });

  it("triggers auto-import once per RESTART period", async () => {
    const store = createStore();

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
      fireUserMetadata({
        google: { connectionState: "ATTENTION" },
        sync: { importGCal: "RESTART" },
      });
      fireUserMetadata({
        google: { connectionState: "HEALTHY" },
        sync: { importGCal: "COMPLETED" },
      });
      fireUserMetadata({
        google: { connectionState: "ATTENTION" },
        sync: { importGCal: "RESTART" },
      });
    });

    await waitFor(() => {
      expect(mockSyncApi.importGCal).toHaveBeenCalledTimes(2);
    });
  });

  it("stores IMPORTING metadata without starting another import", () => {
    const store = createStore();

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
    expect(mockSyncApi.importGCal).not.toHaveBeenCalled();
  });

  it("clears the repair flag and triggers refetch after REPAIR completion", async () => {
    const store = createStore();
    markRepairRequested();

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
      expect(getIsRepairRequested()).toBe(false);
      expect(store.getState().sync.importLatest.isFetchNeeded).toBe(true);
    });
  });

  it("clears the repair flag and shows the repair toast after REPAIR failure", async () => {
    const store = createStore();
    markRepairRequested();

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
      expect(getIsRepairRequested()).toBe(false);
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Google Calendar repair failed",
        expect.anything(),
      );
    });
  });

  it("clears the repair flag when Google is revoked", async () => {
    const store = createStore();
    markRepairRequested();

    render(
      <Provider store={store}>
        <HookHost />
      </Provider>,
    );

    act(() => {
      getSseEmitter().emit(GOOGLE_REVOKED, new MessageEvent(GOOGLE_REVOKED));
    });

    await waitFor(() => {
      expect(getIsRepairRequested()).toBe(false);
      expect(mockHandleGoogleRevoked).toHaveBeenCalledTimes(1);
    });
  });
});
