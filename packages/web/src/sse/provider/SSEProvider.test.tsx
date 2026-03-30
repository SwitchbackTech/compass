import { type EventEmitter2 } from "eventemitter2";
import { act } from "react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useUser } from "@web/auth/hooks/user/useUser";
import {
  importGCalSlice,
  importLatestSlice,
} from "@web/ducks/events/slices/sync.slice";
import SSEProvider from "./SSEProvider";

// Mock dependencies
jest.mock("@web/auth/hooks/session/useSession");
jest.mock("@web/auth/hooks/user/useUser");
jest.mock("@web/auth/session/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/sse.client", () => {
  const eventEmitterModule: {
    EventEmitter2: new (options?: { maxListeners?: number }) => EventEmitter2;
  } = jest.requireActual("eventemitter2");
  const { EventEmitter2 } = eventEmitterModule;
  const sseEmitter = new EventEmitter2({ maxListeners: 20 });
  return {
    openStream: jest.fn(),
    closeStream: jest.fn(),
    getStream: jest.fn(() => null),
    sseEmitter,
  };
});

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe("SSEProvider", () => {
  const mockUserId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: jest.fn(),
    });
    mockUseUser.mockReturnValue({ userId: mockUserId });
  });

  it("keeps the SSE stream open while authenticated even before the user id loads", async () => {
    mockUseUser.mockReturnValue({ userId: undefined });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { closeStream, openStream } = require("../client/sse.client") as {
      closeStream: jest.Mock;
      openStream: jest.Mock;
    };

    render(
      <Provider
        store={configureStore({
          reducer: {
            sync: combineReducers({
              importGCal: importGCalSlice.reducer,
              importLatest: importLatestSlice.reducer,
            }),
          },
        })}
      >
        <SSEProvider>
          <div>Test</div>
        </SSEProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(openStream).toHaveBeenCalled();
    });
    expect(closeStream).not.toHaveBeenCalled();
  });

  it("sets import processing when the import start event arrives", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sseEmitter } = require("../client/sse.client") as {
      sseEmitter: EventEmitter2;
    };
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

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

    act(() => {
      sseEmitter.emit(IMPORT_GCAL_START, new MessageEvent(IMPORT_GCAL_START));
    });

    await waitFor(() => {
      expect(store.getState().sync.importGCal.isProcessing).toBe(true);
    });

    process.env.NODE_ENV = originalNodeEnv;
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
