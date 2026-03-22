import { act } from "react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { IMPORT_GCAL_END } from "@core/constants/websocket.constants";
import { type ImportGCalEndPayload } from "@core/types/websocket.types";
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
  let importEndCallback: ((data?: ImportGCalEndPayload) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    importEndCallback = undefined;
    mockUseUser.mockReturnValue({ userId: mockUserId });

    (socket.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === IMPORT_GCAL_END) {
        importEndCallback = callback;
      }
    });
  });

  it("sets import results and triggers refetch on import completion", async () => {
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

    importEndCallback?.({
      status: "COMPLETED",
      eventsCount: 10,
      calendarsCount: 2,
    });

    const state = store.getState();
    expect(state.sync.importGCal.importResults).toEqual({
      eventsCount: 10,
      calendarsCount: 2,
    });
    expect(state.sync.importLatest.isFetchNeeded).toBe(true);
  });
});
