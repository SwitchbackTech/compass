import { act, renderHook, waitFor } from "@testing-library/react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { useGoogleAuth } from "@web/auth/google/hooks/useGoogleAuth/useGoogleAuth";
import {
  resetGoogleSyncUIStateForTests,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import type * as GoogleAuthUtil from "@web/auth/google/util/google.auth.util";
import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { refreshUserMetadata } from "@web/auth/user/util/user-metadata.util";
import { AuthApi } from "@web/common/apis/auth.api";
import { SyncApi } from "@web/common/apis/sync.api";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

jest.mock("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth");
jest.mock("@web/auth/google/util/google.auth.util", () => ({
  ...jest.requireActual<typeof GoogleAuthUtil>(
    "@web/auth/google/util/google.auth.util",
  ),
  syncPendingLocalEvents: jest.fn(),
}));
jest.mock("@web/auth/user/util/user-metadata.util");
jest.mock("@web/auth/state/auth.state.util");
jest.mock("@web/common/apis/auth.api");
jest.mock("@web/common/apis/sync.api");
jest.mock("@web/common/utils/toast/error-toast.util");
jest.mock("@web/store/store.hooks");

const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<
  typeof useGoogleAuth
>;
const mockSyncPendingLocalEvents =
  syncPendingLocalEvents as jest.MockedFunction<typeof syncPendingLocalEvents>;
const mockShowErrorToast = showErrorToast as jest.MockedFunction<
  typeof showErrorToast
>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<
  typeof useAppDispatch
>;
const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;
const mockHasUserEverAuthenticated =
  hasUserEverAuthenticated as jest.MockedFunction<
    typeof hasUserEverAuthenticated
  >;
const mockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;
const mockSyncApi = SyncApi as jest.Mocked<typeof SyncApi>;
const mockRefreshUserMetadata = refreshUserMetadata as jest.MockedFunction<
  typeof refreshUserMetadata
>;

const getUseGoogleAuthArg = (): NonNullable<
  Parameters<typeof useGoogleAuth>[0]
> => {
  const firstCall = mockUseGoogleAuth.mock.calls.at(0);

  if (!firstCall) {
    throw new Error("Expected useGoogleAuth to be called");
  }

  return firstCall[0] ?? {};
};

describe("useConnectGoogle", () => {
  const mockDispatch = jest.fn();
  const mockLogin = jest.fn();

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
    jest.clearAllMocks();
    resetGoogleSyncUIStateForTests();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
      data: null,
      loading: false,
    });
    mockAuthApi.connectGoogle.mockResolvedValue({ status: "OK" });
    mockSyncApi.importGCal.mockResolvedValue(undefined);
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockRefreshUserMetadata.mockResolvedValue();
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
      expect(mockSyncApi.importGCal).toHaveBeenCalledWith({ force: true });
      expect(result.current.state).toBe("repairing");
    });
  });

  it("clears the repair flag and shows a toast if repair start fails", async () => {
    mockSyncApi.importGCal.mockRejectedValueOnce(new Error("boom"));
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
    expect(mockAuthApi.connectGoogle).toHaveBeenCalledWith(payload);
    expect(mockRefreshUserMetadata).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(triggerFetch());
    expect(mockSyncApi.importGCal).not.toHaveBeenCalled();
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
    mockAuthApi.connectGoogle.mockRejectedValueOnce({
      isAxiosError: true,
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
