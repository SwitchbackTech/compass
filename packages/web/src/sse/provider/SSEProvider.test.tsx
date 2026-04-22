import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { type EventEmitter2 } from "eventemitter2";
import { Provider } from "react-redux";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
const mockUseUser = mock();
const openStream = mock();
const closeStream = mock();
const getStream = mock(() => null);

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));
mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: mockUseUser,
}));
mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mock().mockResolvedValue(undefined),
}));
mock.module("../client/sse.client", () => {
  const eventEmitterModule = require("eventemitter2") as {
    EventEmitter2: new (options?: { maxListeners?: number }) => EventEmitter2;
  };
  const { EventEmitter2 } = eventEmitterModule;
  const sseEmitter = new EventEmitter2({ maxListeners: 20 });
  return {
    openStream,
    closeStream,
    getStream,
    sseEmitter,
  };
});

const { importLatestSlice } =
  require("@web/ducks/events/slices/sync.slice") as typeof import("@web/ducks/events/slices/sync.slice");
const { default: SSEProvider } =
  require("./SSEProvider") as typeof import("./SSEProvider");

describe("SSEProvider", () => {
  beforeEach(() => {
    closeStream.mockClear();
    getStream.mockClear();
    mockUseSession.mockClear();
    mockUseUser.mockClear();
    openStream.mockClear();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
    mockUseUser.mockReturnValue({ userId: "test-user-id" });
  });

  it("keeps the SSE stream open while authenticated even before the user id loads", async () => {
    mockUseUser.mockReturnValue({ userId: undefined });

    render(
      <Provider
        store={configureStore({
          reducer: {
            sync: combineReducers({
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
});

afterAll(() => {
  mock.restore();
});
