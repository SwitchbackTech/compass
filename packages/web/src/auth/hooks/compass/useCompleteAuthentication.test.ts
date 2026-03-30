import { renderHook } from "@testing-library/react";
import type * as GoogleAuthUtil from "@web/auth/google/google.auth.util";
import { syncPendingLocalEvents } from "@web/auth/google/google.auth.util";
import { useSession } from "@web/auth/hooks/session/useSession";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  markUserAsAuthenticated,
} from "@web/auth/state/auth.state.util";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { useCompleteAuthentication } from "./useCompleteAuthentication";

jest.mock("@web/auth/google/google.auth.util", () => ({
  ...jest.requireActual<typeof GoogleAuthUtil>(
    "@web/auth/google/google.auth.util",
  ),
  syncPendingLocalEvents: jest.fn(),
}));
jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: jest.fn(),
}));
jest.mock("@web/auth/session/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn(),
}));
jest.mock("@web/auth/state/auth.state.util", () => ({
  clearAnonymousCalendarChangeSignUpPrompt: jest.fn(),
  markUserAsAuthenticated: jest.fn(),
}));
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

const mockSyncPendingLocalEvents =
  syncPendingLocalEvents as jest.MockedFunction<typeof syncPendingLocalEvents>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockRefreshUserMetadata = refreshUserMetadata as jest.MockedFunction<
  typeof refreshUserMetadata
>;
const mockMarkUserAsAuthenticated =
  markUserAsAuthenticated as jest.MockedFunction<
    typeof markUserAsAuthenticated
  >;
const mockClearAnonymousCalendarChangeSignUpPrompt =
  clearAnonymousCalendarChangeSignUpPrompt as jest.MockedFunction<
    typeof clearAnonymousCalendarChangeSignUpPrompt
  >;
const mockUseAppDispatch = jest.mocked(useAppDispatch);

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
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    mockRefreshUserMetadata.mockResolvedValue();
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
    mockSyncPendingLocalEvents.mockImplementation((dispatch) => {
      dispatch(importGCalSlice.actions.setLocalEventsSynced(5));
      return Promise.resolve(true);
    });
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
