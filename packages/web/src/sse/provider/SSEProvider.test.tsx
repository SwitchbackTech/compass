import { configureStore } from "@reduxjs/toolkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { type EventEmitter2 } from "eventemitter2";
import { Provider } from "react-redux";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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
      <QueryClientProvider client={createCompassQueryClient()}>
        <Provider
          store={configureStore({
            reducer: {
              userMetadata: userMetadataSlice.reducer,
            },
          })}
        >
          <SSEProvider>
            <div>Test</div>
          </SSEProvider>
        </Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(openStream).toHaveBeenCalled();
    });
    expect(closeStream).not.toHaveBeenCalled();
  });
});
