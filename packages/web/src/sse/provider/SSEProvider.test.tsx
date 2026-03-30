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
  const listeners = new Map<string, ((mockEvt: Event) => void)[]>();
  const mockES = {
    addEventListener: jest.fn(
      (event: string, handler: (mockEvt: Event) => void) => {
        const existing = listeners.get(event) ?? [];
        listeners.set(event, [...existing, handler]);
      },
    ),
    removeEventListener: jest.fn(),
    close: jest.fn(),
    readyState: 1,
  };
  return {
    openStream: jest.fn(() => mockES),
    closeStream: jest.fn(),
    getStream: jest.fn(() => mockES),
    _mockES: mockES,
    _listeners: listeners,
  };
});

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe("SSEProvider", () => {
  const mockUserId = "test-user-id";
  let importEndCallback: ((data?: ImportGCalEndPayload) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    importEndCallback = undefined;
    mockUseUser.mockReturnValue({ userId: mockUserId });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sseClientMock = require("../client/sse.client") as {
      _listeners: Map<string, ((mockEvt: Event) => void)[]>;
      getStream: jest.Mock;
    };

    jest.mocked(sseClientMock.getStream).mockImplementation(() => ({
      addEventListener: jest.fn(
        (event: string, handler: (mockEvt: Event) => void) => {
          if (event === IMPORT_GCAL_END) {
            importEndCallback = (data?: ImportGCalEndPayload) => {
              const messageEvent = new MessageEvent(IMPORT_GCAL_END, {
                data: JSON.stringify(data),
              });
              handler(messageEvent);
            };
          }
        },
      ),
      removeEventListener: jest.fn(),
      close: jest.fn(),
    }));
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
        <SSEProvider>
          <div>Test</div>
        </SSEProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(importEndCallback).toBeDefined();
    });

    importEndCallback?.({
      operation: "REPAIR",
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
