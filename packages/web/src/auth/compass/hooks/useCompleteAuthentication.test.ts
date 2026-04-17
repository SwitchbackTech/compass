import { mock, expect, describe, it, beforeEach } from "bun:test";

// Pre-define mock functions
const mockSyncPendingLocalEvents = mock();
const mockUseSession = mock();
const mockRefreshUserMetadata = mock();
const mockClearAnonymousCalendarChangeSignUpPrompt = mock();
const mockMarkUserAsAuthenticated = mock();
const mockUseAppDispatch = mock();

mock.module("@web/auth/google/util/google.auth.util", () => ({
  syncPendingLocalEvents: mockSyncPendingLocalEvents,
}));

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mockRefreshUserMetadata,
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  clearAnonymousCalendarChangeSignUpPrompt:
    mockClearAnonymousCalendarChangeSignUpPrompt,
  markUserAsAuthenticated: mockMarkUserAsAuthenticated,
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
    mockMarkUserAsAuthenticated.mockClear();
    mockClearAnonymousCalendarChangeSignUpPrompt.mockClear();
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

    await result.current({ email: "test@example.com" });

    expect(mockClearAnonymousCalendarChangeSignUpPrompt).toHaveBeenCalled();
    expect(mockMarkUserAsAuthenticated).toHaveBeenCalledWith(
      "test@example.com",
    );
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/authSuccess" }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "importLatest/triggerFetch" }),
    );
    expect(mockRefreshUserMetadata).toHaveBeenCalled();
  });

  it("records synced local events count", async () => {
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    const { result } = renderHook(() => useCompleteAuthentication());

    await result.current({ email: "test@example.com" });

    expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
  });
});
