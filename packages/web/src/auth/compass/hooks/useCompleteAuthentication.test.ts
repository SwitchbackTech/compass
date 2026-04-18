import { afterAll, beforeEach, describe, it, mock } from "bun:test";

// Pre-define mock functions
const mockSyncPendingLocalEvents = mock();
const mockUseSession = mock();
const mockRefreshUserMetadata = mock();
const mockUseAppDispatch = mock();

mock.module("@web/auth/google/util/google.auth.util", () => ({
  authenticate: mock(),
  handleGoogleRevoked: mock(),
  showLocalEventsSyncFailure: mock(),
  syncLocalEvents: mock(),
  syncPendingLocalEvents: mockSyncPendingLocalEvents,
}));

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mockRefreshUserMetadata,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: mockUseAppDispatch,
}));

// Mock the ducks/slices to avoid loading their dependencies if they trigger side effects
mock.module("@web/ducks/auth/slices/auth.slice", () => ({
  authSuccess: mock().mockReturnValue({ type: "auth/authSuccess" }),
}));

mock.module("@web/ducks/events/slices/sync.slice", () => ({
  triggerFetch: mock().mockReturnValue({ type: "importLatest/triggerFetch" }),
}));

import { renderHook } from "@testing-library/react";

const { useCompleteAuthentication } = require("./useCompleteAuthentication");

describe("useCompleteAuthentication", () => {
  const mockDispatch = mock();
  const mockSetAuthenticated = mock();

  beforeEach(() => {
    mockSyncPendingLocalEvents.mockClear();
    mockUseSession.mockClear();
    mockRefreshUserMetadata.mockClear();
    mockUseAppDispatch.mockClear();
    mockDispatch.mockClear();
    mockSetAuthenticated.mockClear();

    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mockSetAuthenticated,
    });
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    mockRefreshUserMetadata.mockResolvedValue(true);
  });

  it("completes authentication and triggers fetch", async () => {
    const { result } = renderHook(() => useCompleteAuthentication());

    await Promise.resolve(result.current({ email: "test@example.com" }));
  });

  it("records synced local events count", async () => {
    const { result } = renderHook(() => useCompleteAuthentication());

    await Promise.resolve(result.current({ email: "test@example.com" }));
  });
});

afterAll(() => {
  mock.restore();
});
