import { QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { createFakeServerMessageBus } from "@web/__tests__/utils/sse-message-bus.test.util";
import { createCompassQueryClient } from "@web/api/query-client";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
const mockUseUser = mock();
const openStream = mock();
const closeStream = mock();
const getStream = mock(() => null);
// SSEProvider mounts useSyncFocusRefresh, which calls the real
// useConnectGoogle() by default. mock.module leaks process-wide across the
// full test suite (not scoped to this file), so without an explicit mock
// here this file is at the mercy of whichever OTHER file's useConnectGoogle
// mock happened to load last — e.g. CalendarListHeader.test.tsx's mock omits
// `refresh` entirely, which throws when useSyncFocusRefresh calls it. This
// test isn't about Google/sync behavior, so give it its own stable, complete
// fake rather than relying on load order.
const mockUseConnectGoogle = mock(() => ({
  commandAction: null,
  isAvailable: false,
  isConnecting: false,
  isRefreshing: false,
  state: "NOT_CONNECTED" as const,
  connect: mock(),
  refresh: mock(),
}));

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));
mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: mockUseUser,
}));
mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mock().mockResolvedValue(undefined),
}));
mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: mockUseConnectGoogle,
}));
mock.module("../client/sse.client", () => ({
  openStream,
  closeStream,
  getStream,
  onServerMessage: createFakeServerMessageBus().onServerMessage,
  onStreamReopen: () => () => undefined,
}));

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
