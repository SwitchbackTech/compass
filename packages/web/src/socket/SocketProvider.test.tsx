import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { IMPORT_GCAL_END } from "@core/constants/websocket.constants";
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ userId: mockUserId });

    // Mock socket.on to capture the IMPORT_GCAL_END callback
    (socket.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === IMPORT_GCAL_END) {
        importEndCallback = callback;
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
        importGCal: importGCalSlice.reducer,
        importLatest: importLatestSlice.reducer,
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
      importEndCallback(JSON.stringify({ eventsCount: 10, calendarsCount: 2 }));
    }

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });

    // Verify import results are set in Redux store
    const state = store.getState();
    expect(state.importGCal.importResults).toEqual({
      eventsCount: 10,
      calendarsCount: 2,
    });

    // Verify importing flag is set to false
    expect(state.importGCal.importing).toBe(false);

    // Verify triggerFetch was dispatched (isFetchNeeded should be true)
    expect(state.importLatest.isFetchNeeded).toBe(true);
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
        importGCal: importGCalSlice.reducer,
        importLatest: importLatestSlice.reducer,
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
    expect(state.importGCal.importResults).toBeNull();

    // Verify importing flag is set to false
    expect(state.importGCal.importing).toBe(false);

    // Verify triggerFetch was NOT dispatched
    expect(state.importLatest.isFetchNeeded).toBe(false);
  });
});
