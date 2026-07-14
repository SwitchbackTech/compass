import { QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { createCompassQueryClient } from "@web/api/query-client";
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
  const listenersByType = new Map<string, Set<(message: unknown) => void>>();
  const onServerMessage = (
    type: string,
    handler: (message: unknown) => void,
  ) => {
    let listeners = listenersByType.get(type);
    if (!listeners) {
      listeners = new Set();
      listenersByType.set(type, listeners);
    }
    listeners.add(handler);
    return () => listeners.delete(handler);
  };
  return {
    openStream,
    closeStream,
    getStream,
    onServerMessage,
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
        <SSEProvider>
          <div>Test</div>
        </SSEProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(openStream).toHaveBeenCalled();
    });
    expect(closeStream).not.toHaveBeenCalled();
  });
});
