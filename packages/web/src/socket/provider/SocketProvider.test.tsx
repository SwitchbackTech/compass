import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/websocket.constants";
import { useUser } from "@web/auth/hooks/user/useUser";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "./SocketProvider";
import SocketProvider from "./SocketProvider";

// Mock dependencies
jest.mock("@web/auth/hooks/user/useUser");
jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeListener: jest.fn(),
    connected: false,
  })),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe("SocketProvider", () => {
  const mockUserId = "test-user-id";
  let importEndCallback: ((data?: string) => void) | undefined;
  let importStartCallback: ((data?: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    importEndCallback = undefined;
    importStartCallback = undefined;
    mockUseUser.mockReturnValue({ userId: mockUserId });

    (socket.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === IMPORT_GCAL_END) {
        importEndCallback = callback;
      }
      if (event === IMPORT_GCAL_START) {
        importStartCallback = callback;
      }
    });
  });

  it("sets import results and triggers refetch when awaiting import results", async () => {
    const store = configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
      },
    });

    store.dispatch(importGCalSlice.actions.setAwaitingImportResults(true));

    render(
      <Provider store={store}>
        <SocketProvider>
          <div>Test</div>
        </SocketProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(importEndCallback).toBeDefined();
    });

    importStartCallback?.();
    importEndCallback?.(JSON.stringify({ eventsCount: 10, calendarsCount: 2 }));

    const state = store.getState();
    expect(state.sync.importGCal.importResults).toEqual({
      eventsCount: 10,
      calendarsCount: 2,
    });
    expect(state.sync.importGCal.importing).toBe(false);
    expect(state.sync.importGCal.awaitingImportResults).toBe(false);
    expect(state.sync.importLatest.isFetchNeeded).toBe(true);
  });

  it("does not set import results when not awaiting import results", async () => {
    const store = configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
      },
    });

    render(
      <Provider store={store}>
        <SocketProvider>
          <div>Test</div>
        </SocketProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(importEndCallback).toBeDefined();
    });

    importEndCallback?.();

    const state = store.getState();
    expect(state.sync.importGCal.importResults).toBeNull();
    expect(state.sync.importLatest.isFetchNeeded).toBe(false);
  });

  it("clears previous import results when new import starts", async () => {
    const store = configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
      },
    });

    store.dispatch(
      importGCalSlice.actions.setImportResults({
        eventsCount: 3,
        calendarsCount: 1,
      }),
    );

    render(
      <Provider store={store}>
        <SocketProvider>
          <div>Test</div>
        </SocketProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(importStartCallback).toBeDefined();
    });

    importStartCallback?.();

    const state = store.getState();
    expect(state.sync.importGCal.importResults).toBeNull();
    expect(state.sync.importGCal.importing).toBe(true);
  });
});
