import { act, renderHook } from "@testing-library/react";
import { syncLocalEvents } from "@web/auth/google/google.auth.util";
import { useSession } from "@web/auth/hooks/session/useSession";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { markUserAsAuthenticated } from "@web/auth/state/auth.state.util";
import { useCompleteAuthentication } from "./useCompleteAuthentication";

jest.mock("@web/auth/google/google.auth.util", () => ({
  syncLocalEvents: jest.fn(),
}));
jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: jest.fn(),
}));
jest.mock("@web/auth/session/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn(),
}));
jest.mock("@web/auth/state/auth.state.util", () => ({
  markUserAsAuthenticated: jest.fn(),
}));
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

const mockSyncLocalEvents = syncLocalEvents as jest.MockedFunction<
  typeof syncLocalEvents
>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockRefreshUserMetadata = refreshUserMetadata as jest.MockedFunction<
  typeof refreshUserMetadata
>;
const mockMarkUserAsAuthenticated =
  markUserAsAuthenticated as jest.MockedFunction<
    typeof markUserAsAuthenticated
  >;
const storeHooksMock = jest.requireMock("@web/store/store.hooks") as {
  useAppDispatch: jest.Mock;
};
const mockUseAppDispatch = storeHooksMock.useAppDispatch;

describe("useCompleteAuthentication", () => {
  const mockDispatch = jest.fn();
  const mockSetAuthenticated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mockSetAuthenticated,
    });
    mockSyncLocalEvents.mockResolvedValue({ success: true, syncedCount: 0 });
    mockRefreshUserMetadata.mockResolvedValue();
  });

  it("completes authentication and triggers fetch", async () => {
    const { result } = renderHook(() => useCompleteAuthentication());

    await result.current({ email: "test@example.com" });

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
    mockSyncLocalEvents.mockResolvedValue({ success: true, syncedCount: 5 });
    const { result } = renderHook(() => useCompleteAuthentication());

    await result.current({ email: "test@example.com" });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "async/importGCal/setLocalEventsSynced",
        payload: 5,
      }),
    );
  });
});
