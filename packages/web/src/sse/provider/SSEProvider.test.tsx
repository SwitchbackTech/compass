import { type EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { IMPORT_GCAL_END } from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { useUser } from "@web/auth/hooks/user/useUser";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import SSEProvider from "./SSEProvider";

// Mock dependencies
jest.mock("@web/auth/hooks/user/useUser");
jest.mock("@web/auth/session/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/sse.client", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter2 } = require("eventemitter2");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const sseEmitter = new EventEmitter2({ maxListeners: 20 });
  return {
    openStream: jest.fn(),
    closeStream: jest.fn(),
    getStream: jest.fn(() => null),
    sseEmitter,
  };
});

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe("SSEProvider", () => {
  const mockUserId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ userId: mockUserId });
  });

  it("sets import results and triggers refetch on import completion", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sseEmitter } = require("../client/sse.client") as {
      sseEmitter: EventEmitter2;
    };

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
        <SSEProvider>
          <div>Test</div>
        </SSEProvider>
      </Provider>,
    );

    const payload: ImportGCalEndPayload = {
      operation: "REPAIR",
      status: "COMPLETED",
      eventsCount: 10,
      calendarsCount: 2,
    };

    act(() => {
      sseEmitter.emit(
        IMPORT_GCAL_END,
        new MessageEvent(IMPORT_GCAL_END, { data: JSON.stringify(payload) }),
      );
    });

    await waitFor(() => {
      const state = store.getState();
      expect(state.sync.importGCal.importResults).toEqual({
        eventsCount: 10,
        calendarsCount: 2,
      });
    });

    expect(store.getState().sync.importLatest.isFetchNeeded).toBe(true);
  });
});
