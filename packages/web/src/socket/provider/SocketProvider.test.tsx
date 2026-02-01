import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { useSession } from "@web/auth/hooks/useSession";
import { useUser } from "@web/auth/hooks/useUser";
import { CompassSession } from "@web/auth/session/session.types";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "./SocketProvider";
import SocketProvider from "./SocketProvider";

// Mock dependencies
jest.mock("@web/auth/hooks/useUser");
jest.mock("@web/auth/hooks/useSession");
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
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe("SocketProvider", () => {
  const mockSetIsSyncing = jest.fn();
  const mockUserId = "test-user-id";
  let importEndCallback: ((data?: string) => void) | undefined;
  let importStartCallback: ((data?: string) => void) | undefined;
  let userMetadataCallback: ((data: any) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    importEndCallback = undefined;
    importStartCallback = undefined;
    userMetadataCallback = undefined;
    mockUseUser.mockReturnValue({ userId: mockUserId });

    // Mock socket.on to capture the IMPORT_GCAL_END callback
    (socket.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === IMPORT_GCAL_END) {
        importEndCallback = callback;
      }
      if (event === IMPORT_GCAL_START) {
        importStartCallback = callback;
      }
      if (event === USER_METADATA) {
        userMetadataCallback = callback;
      }
    });
  });

  it("sets import results and triggers refetch when IMPORT_GCAL_END is received during post-auth sync", async () => {
    // Set up post-auth sync state
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

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

    // Wait for the component to mount and register the callback
    await waitFor(() => {
      expect(importEndCallback).toBeDefined();
    });

    // Simulate IMPORT_GCAL_END event with import results
    if (importEndCallback) {
      importStartCallback?.();
      importEndCallback(JSON.stringify({ eventsCount: 10, calendarsCount: 2 }));
    }

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });

    // Verify import results are set in Redux store
    const state = store.getState();
    expect(state.sync.importGCal.importResults).toEqual({
      eventsCount: 10,
      calendarsCount: 2,
    });

    // Verify importing flag is set to false
    expect(state.sync.importGCal.importing).toBe(false);

    // Verify triggerFetch was dispatched (isFetchNeeded should be true)
    expect(state.sync.importLatest.isFetchNeeded).toBe(true);
  });

  it("does not set import results when IMPORT_GCAL_END is received during regular background sync", async () => {
    // Set up regular background sync (isSyncing is false)
    const mockSession: CompassSession = {
      isSyncing: false,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

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

    // Wait for the component to mount and register the callback
    await waitFor(() => {
      expect(importEndCallback).toBeDefined();
    });

    // Simulate IMPORT_GCAL_END event
    if (importEndCallback) {
      importEndCallback();
    }

    // Wait a bit to ensure no async calls are made
    await waitFor(
      () => {
        expect(mockSetIsSyncing).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );

    // Verify import results remain null (not set) in Redux store
    const state = store.getState();
    expect(state.sync.importGCal.importResults).toBeNull();

    // Verify importing flag is set to false
    expect(state.sync.importGCal.importing).toBe(false);

    // Verify triggerFetch was NOT dispatched
    expect(state.sync.importLatest.isFetchNeeded).toBe(false);
  });

  it("dismisses import overlay immediately when IMPORT_GCAL_END is received", async () => {
    // Set up post-auth sync state with importing=true
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    const store = configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
      },
      preloadedState: {
        sync: {
          importGCal: {
            importing: true, // Start with overlay visible
            importResults: null,
            pendingLocalEventsSynced: null,
            isProcessing: false,
            isSuccess: false,
            error: null,
            value: null,
            reason: null,
          },
          importLatest: {
            isFetchNeeded: false,
            reason: null,
          },
        },
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

    // Verify importing is true initially
    expect(store.getState().sync.importGCal.importing).toBe(true);

    // Simulate import completion
    if (importEndCallback) {
      importStartCallback?.();
      importEndCallback();
    }

    // Verify importing flag is immediately set to false (overlay dismissed)
    await waitFor(() => {
      expect(store.getState().sync.importGCal.importing).toBe(false);
    });
  });

  it("handles payload as object when IMPORT_GCAL_END is received", async () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

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

    // Simulate import with object payload (not stringified)
    if (importEndCallback) {
      importStartCallback?.();
      // @ts-expect-error testing object payload handling
      importEndCallback({ eventsCount: 25, calendarsCount: 3 });
    }

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });

    const state = store.getState();
    expect(state.sync.importGCal.importResults).toEqual({
      eventsCount: 25,
      calendarsCount: 3,
    });
  });

  it("does not show results when import was not started (importStartedRef is false)", async () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

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

    // Call importEndCallback WITHOUT first calling importStartCallback
    // This simulates receiving IMPORT_GCAL_END when the frontend didn't
    // know an import was happening
    if (importEndCallback) {
      importEndCallback(JSON.stringify({ eventsCount: 10 }));
    }

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });

    // Import results should NOT be set since importStartedRef was false
    const state = store.getState();
    expect(state.sync.importGCal.importResults).toBeNull();

    // triggerFetch should NOT have been called
    expect(state.sync.importLatest.isFetchNeeded).toBe(false);
  });

  it("triggers event refetch when import completes during post-auth sync", async () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

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

    // Verify isFetchNeeded starts as false
    expect(store.getState().sync.importLatest.isFetchNeeded).toBe(false);

    if (importEndCallback) {
      importStartCallback?.();
      importEndCallback();
    }

    // triggerFetch should be called to load the imported events
    await waitFor(() => {
      expect(store.getState().sync.importLatest.isFetchNeeded).toBe(true);
    });

    // Verify the reason is set correctly
    expect(store.getState().sync.importLatest.reason).toBe("IMPORT_COMPLETE");
  });

  it("clears previous import results when new import starts", async () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    const store = configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
      },
      preloadedState: {
        sync: {
          importGCal: {
            importing: false,
            importResults: { eventsCount: 100, calendarsCount: 5 }, // Previous results
            pendingLocalEventsSynced: null,
            isProcessing: false,
            isSuccess: false,
            error: null,
            value: null,
            reason: null,
          },
          importLatest: {
            isFetchNeeded: false,
            reason: null,
          },
        },
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
      expect(importStartCallback).toBeDefined();
    });

    // Verify previous results exist
    expect(store.getState().sync.importGCal.importResults).toEqual({
      eventsCount: 100,
      calendarsCount: 5,
    });

    // Simulate new import starting
    if (importStartCallback) {
      importStartCallback();
    }

    // Previous results should be cleared
    await waitFor(() => {
      expect(store.getState().sync.importGCal.importResults).toBeNull();
    });

    // Importing flag should be true
    expect(store.getState().sync.importGCal.importing).toBe(true);
  });

  it("handles race condition where USER_METADATA arrives before IMPORT_GCAL_END", async () => {
    // This test ensures that if USER_METADATA says "not importing", but we locally know
    // we were importing (via importStartedRef), we wait for IMPORT_GCAL_END instead of
    // closing the sync flow immediately.

    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    const store = configureStore({
      reducer: {
        sync: combineReducers({
          importGCal: importGCalSlice.reducer,
          importLatest: importLatestSlice.reducer,
        }),
      },
      preloadedState: {
        sync: {
          importGCal: {
            importing: true, // Start with importing=true
            importResults: null,
            pendingLocalEventsSynced: null,
            isProcessing: false,
            isSuccess: false,
            error: null,
            value: null,
            reason: null,
          },
          importLatest: {
            isFetchNeeded: false,
            reason: null,
          },
        },
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
      expect(userMetadataCallback).toBeDefined();
      expect(importEndCallback).toBeDefined();
    });

    // 1. Simulate USER_METADATA event saying "not importing"
    // This is the "race" - it arrives before the end event
    if (userMetadataCallback) {
      userMetadataCallback({
        _id: mockUserId,
        sync: { importGCal: "done" }, // Not 'importing'
      });
    }

    // Verify setIsSyncing was NOT called yet (because we are waiting for import end)
    await waitFor(
      () => {
        expect(mockSetIsSyncing).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );

    // 2. Simulate IMPORT_GCAL_END event
    if (importEndCallback) {
      importEndCallback(JSON.stringify({ eventsCount: 50 }));
    }

    // Now setIsSyncing should be called
    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });

    // And results should be set
    const state = store.getState();
    expect(state.sync.importGCal.importResults).toEqual({
      eventsCount: 50,
    });
  });
});
