import { Provider } from "react-redux";
import { toast } from "react-toastify";
import { configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { IMPORT_GCAL_END } from "@core/constants/websocket.constants";
import { CompassSession } from "@web/auth/session/session.types";
import { useUser } from "@web/auth/useUser";
import { useSession } from "@web/common/hooks/useSession";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { socket } from "./SocketProvider";
import SocketProvider from "./SocketProvider";

// Mock dependencies
jest.mock("@web/auth/useUser");
jest.mock("@web/common/hooks/useSession");
jest.mock("react-toastify", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));
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
const mockToastSuccess = toast.success as jest.MockedFunction<
  typeof toast.success
>;

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    reload: mockReload,
  },
});

describe("SocketProvider", () => {
  const mockSetIsSyncing = jest.fn();
  const mockUserId = "test-user-id";
  let importEndCallback: (() => void) | undefined;

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

  it("shows success toast and reloads page when IMPORT_GCAL_END is received during post-auth sync", async () => {
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

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Your events have been synced successfully!",
      expect.any(Object),
    );
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("does not reload page when IMPORT_GCAL_END is received during regular background sync", async () => {
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

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });
});
