import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import {
  resetGoogleSyncUIStateForTests,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

type UseGoogleAuthArg = NonNullable<
  Parameters<
    typeof import("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth").useGoogleAuth
  >[0]
>;

const mockConnectGoogle = mock();
const mockDispatch = mock();
const mockHandleGoogleRevoked = mock();
const mockHasUserEverAuthenticated = mock();
const mockImportGCal = mock();
const mockLogin = mock();
const mockRefreshUserMetadata = mock();
const mockDismissErrorToast = mock();
const mockShowErrorToast = mock();
const mockShowSessionExpiredToast = mock();
const mockSyncPendingLocalEvents = mock();
const mockUseAppDispatch = mock();
const mockUseAppSelector = mock();
const mockUseGoogleAuth = mock();

mock.module("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth", () => ({
  useGoogleAuth: mockUseGoogleAuth,
}));

mock.module("@web/auth/google/util/google.auth.util", () => ({
  authenticate: mock(),
  handleGoogleRevoked: mockHandleGoogleRevoked,
  showLocalEventsSyncFailure: mock(),
  syncLocalEvents: mock(),
  syncPendingLocalEvents: mockSyncPendingLocalEvents,
}));

mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mockRefreshUserMetadata,
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  hasUserEverAuthenticated: mockHasUserEverAuthenticated,
}));

mock.module("@web/common/apis/auth.api", () => ({
  AuthApi: {
    connectGoogle: mockConnectGoogle,
  },
}));

mock.module("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: mockImportGCal,
  },
}));

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  dismissErrorToast: mockDismissErrorToast,
  ErrorToastSeverity: {
    CRITICAL: "critical",
    DEFAULT: "default",
  },
  SESSION_EXPIRED_TOAST_ID: "session-expired-api",
  showErrorToast: mockShowErrorToast,
  showSessionExpiredToast: mockShowSessionExpiredToast,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: mockUseAppDispatch,
  useAppSelector: mockUseAppSelector,
}));

const { useConnectGoogle } =
  require("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle") as typeof import("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle");

const getUseGoogleAuthArg = (): UseGoogleAuthArg => {
  const firstCall = mockUseGoogleAuth.mock.calls.at(0);

  if (!firstCall) {
    throw new Error("Expected useGoogleAuth to be called");
  }

  return firstCall[0] ?? {};
};

describe("useConnectGoogle", () => {
  const setSelectorState = ({
    connectionState = "NOT_CONNECTED",
    userMetadataStatus = "loading",
  }: {
    connectionState?:
      | "ATTENTION"
      | "HEALTHY"
      | "IMPORTING"
      | "NOT_CONNECTED"
      | "RECONNECT_REQUIRED";
    userMetadataStatus?: "idle" | "loaded" | "loading";
  } = {}) => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return connectionState;
      }

      if (selector === selectUserMetadataStatus) {
        return userMetadataStatus;
      }

      return undefined;
    });
  };

  beforeEach(() => {
    mockConnectGoogle.mockClear();
    mockDispatch.mockClear();
    mockHandleGoogleRevoked.mockClear();
    mockHasUserEverAuthenticated.mockClear();
    mockImportGCal.mockClear();
    mockLogin.mockClear();
    mockRefreshUserMetadata.mockClear();
    mockDismissErrorToast.mockClear();
    mockShowErrorToast.mockClear();
    mockShowSessionExpiredToast.mockClear();
    mockSyncPendingLocalEvents.mockClear();
    mockUseAppDispatch.mockClear();
    mockUseAppSelector.mockClear();
    mockUseGoogleAuth.mockClear();

    resetGoogleSyncUIStateForTests();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
      data: null,
      loading: false,
    });
    mockConnectGoogle.mockResolvedValue({ status: "OK" });
    mockImportGCal.mockResolvedValue(undefined);
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockRefreshUserMetadata.mockResolvedValue(undefined);
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    setSelectorState();
  });

  it("returns checking state when metadata is still loading", () => {
    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.commandAction.label).toBe(
      "Checking Google Calendar…",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Checking Google Calendar status…",
    );
  });

  it("returns connect state when metadata is loaded and Google is not connected", () => {
    setSelectorState({
      connectionState: "NOT_CONNECTED",
      userMetadataStatus: "loaded",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Google Calendar not connected. Click to connect.",
    );
  });

  it("returns connected state when metadata is healthy", () => {
    setSelectorState({
      connectionState: "HEALTHY",
      userMetadataStatus: "loaded",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.commandAction.label).toBe(
      "Google Calendar Connected",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
  });

  it("shows repairing state from the local repair store", () => {
    setRepairingSyncIndicatorOverride();
    setSelectorState({
      connectionState: "ATTENTION",
      userMetadataStatus: "loaded",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.state).toBe("repairing");
    expect(result.current.commandAction.label).toBe(
      "Repairing Google Calendar…",
    );
    expect(result.current.isRepairing).toBe(true);
  });

  it("starts a forced repair directly and moves the UI into repairing", async () => {
    setSelectorState({
      connectionState: "ATTENTION",
      userMetadataStatus: "loaded",
    });

    const { result } = renderHook(() => useConnectGoogle());

    act(() => {
      result.current.commandAction.onSelect?.();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
    await waitFor(() => {
      expect(mockImportGCal).toHaveBeenCalledWith({ force: true });
      expect(result.current.state).toBe("repairing");
    });
  });

  it("clears the repair flag and shows a toast if repair start fails", async () => {
    mockImportGCal.mockRejectedValueOnce(new Error("boom"));
    setSelectorState({
      connectionState: "ATTENTION",
      userMetadataStatus: "loaded",
    });

    const { result } = renderHook(() => useConnectGoogle());

    act(() => {
      result.current.commandAction.onSelect?.();
    });

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Google Calendar repair failed. Please try again.",
        expect.anything(),
      );
      expect(result.current.state).toBe("ATTENTION");
    });
  });

  it("connects Google through the backend endpoint and refreshes metadata", async () => {
    setSelectorState({
      connectionState: "ATTENTION",
      userMetadataStatus: "loaded",
    });

    renderHook(() => useConnectGoogle());

    const useGoogleAuthArg = getUseGoogleAuthArg();
    if (!useGoogleAuthArg?.onSuccess) {
      throw new Error("Expected useGoogleAuth to receive an onSuccess handler");
    }

    const payload = {
      clientType: "web" as const,
      thirdPartyId: "google" as const,
      redirectURIInfo: {
        redirectURIOnProviderDashboard: window.location.origin,
        redirectURIQueryParams: {
          code: "auth-code",
          scope: "scope",
          state: "state",
        },
      },
    };

    await act(async () => {
      await useGoogleAuthArg.onSuccess(payload);
    });

    expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
    expect(mockConnectGoogle).toHaveBeenCalledWith(payload);
    expect(mockRefreshUserMetadata).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(triggerFetch());
    expect(mockImportGCal).not.toHaveBeenCalled();
  });

  it("shows syncing UI immediately after Google auth succeeds", async () => {
    setSelectorState({
      connectionState: "ATTENTION",
      userMetadataStatus: "loaded",
    });

    const { result } = renderHook(() => useConnectGoogle());
    const useGoogleAuthArg = getUseGoogleAuthArg();
    if (!useGoogleAuthArg?.onSuccess) {
      throw new Error("Expected useGoogleAuth to receive an onSuccess handler");
    }

    const payload = {
      clientType: "web" as const,
      thirdPartyId: "google" as const,
      redirectURIInfo: {
        redirectURIOnProviderDashboard: window.location.origin,
        redirectURIQueryParams: {
          code: "auth-code",
          scope: "scope",
          state: "state",
        },
      },
    };

    await act(async () => {
      await useGoogleAuthArg.onSuccess(payload);
    });

    expect(result.current.state).toBe("IMPORTING");
    expect(result.current.commandAction.label).toBe("Syncing Google Calendar…");
  });

  it("shows the server message when Google connect fails", async () => {
    setSelectorState({
      connectionState: "NOT_CONNECTED",
      userMetadataStatus: "loaded",
    });
    mockConnectGoogle.mockRejectedValueOnce({
      config: { url: "/auth/google/connect" },
      response: {
        data: {
          code: "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
          message:
            "Google account is already connected to another Compass user",
        },
      },
    } as never);

    renderHook(() => useConnectGoogle());
    const useGoogleAuthArg = getUseGoogleAuthArg();
    if (!useGoogleAuthArg?.onSuccess) {
      throw new Error("Expected useGoogleAuth to receive an onSuccess handler");
    }

    const payload = {
      clientType: "web" as const,
      thirdPartyId: "google" as const,
      redirectURIInfo: {
        redirectURIOnProviderDashboard: window.location.origin,
        redirectURIQueryParams: {
          code: "auth-code",
          scope: "scope",
          state: "state",
        },
      },
    };

    await expect(useGoogleAuthArg.onSuccess(payload)).resolves.toBe(false);

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      "Google account is already connected to another Compass user",
    );
    expect(mockRefreshUserMetadata).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(triggerFetch());
  });
});

afterAll(() => {
  mock.restore();
});
