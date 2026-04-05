import type { Mock } from "bun:test";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useSession } from "@web/auth/compass/session/useSession";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  markUserAsAuthenticated,
} from "@web/auth/compass/state/auth.state.util";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import { useAppDispatch } from "@web/store/store.hooks";
import { useCompleteAuthentication } from "./useCompleteAuthentication";

void mock.module("@web/auth/google/util/google.auth.util", () => ({
  syncPendingLocalEvents: mock(),
}));

void mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mock(),
}));

void mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mock(),
}));

void mock.module("@web/auth/compass/state/auth.state.util", () => ({
  clearAnonymousCalendarChangeSignUpPrompt: mock(),
  markUserAsAuthenticated: mock(),
}));

void mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: mock(),
}));

const mockSyncPendingLocalEvents = syncPendingLocalEvents as Mock<
  typeof syncPendingLocalEvents
>;
const mockUseSession = useSession as Mock<typeof useSession>;
const mockRefreshUserMetadata = refreshUserMetadata as Mock<
  typeof refreshUserMetadata
>;
const mockMarkUserAsAuthenticated = markUserAsAuthenticated as Mock<
  typeof markUserAsAuthenticated
>;
const mockClearAnonymousCalendarChangeSignUpPrompt =
  clearAnonymousCalendarChangeSignUpPrompt as Mock<
    typeof clearAnonymousCalendarChangeSignUpPrompt
  >;
const mockUseAppDispatch = useAppDispatch as Mock<typeof useAppDispatch>;

describe("useCompleteAuthentication", () => {
  const mockDispatch = mock();
  const mockSetAuthenticated = mock();

  beforeEach(() => {
    mock.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mockSetAuthenticated,
    });
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    mockRefreshUserMetadata.mockResolvedValue(undefined);
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
