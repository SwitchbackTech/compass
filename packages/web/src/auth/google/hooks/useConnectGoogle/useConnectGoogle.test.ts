import { toast } from "react-toastify";
import { renderHook, waitFor } from "@testing-library/react";
import type * as GoogleAuthUtil from "@web/auth/google/google.auth.util";
import { syncPendingLocalEvents } from "@web/auth/google/google.auth.util";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { useGoogleAuth } from "@web/auth/google/hooks/useGoogleAuth/useGoogleAuth";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { refreshUserMetadata } from "@web/auth/user/util/user-metadata.util";
import { AuthApi } from "@web/common/apis/auth.api";
import { SyncApi } from "@web/common/apis/sync.api";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import { selectImportGCalState } from "@web/ducks/events/selectors/sync.selector";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

jest.mock("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth");
jest.mock("@web/auth/google/google.auth.util", () => ({
  ...jest.requireActual<typeof GoogleAuthUtil>(
    "@web/auth/google/google.auth.util",
  ),
  syncPendingLocalEvents: jest.fn(),
}));
jest.mock("@web/auth/user/util/user-metadata.util");
jest.mock("@web/auth/state/auth.state.util");
jest.mock("@web/common/apis/auth.api");
jest.mock("@web/common/apis/sync.api");
jest.mock("@web/common/utils/toast/error-toast.util");
jest.mock("@web/store/store.hooks");
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
  },
}));

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
const mockRefreshUserMetadata = refreshUserMetadata as jest.MockedFunction<
  typeof refreshUserMetadata
>;
const mockSyncApi = SyncApi as jest.Mocked<typeof SyncApi>;
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

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

  const expectGoogleAuthConfig = () => {
    const arg = getUseGoogleAuthArg();

    expect(arg.prompt).toBe("consent");
    expect(typeof arg.onSuccess).toBe("function");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
      data: null,
      loading: false,
    });
    mockAuthApi.connectGoogle.mockResolvedValue({ status: "OK" });
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockRefreshUserMetadata.mockResolvedValue();
    mockSyncApi.importGCal.mockResolvedValue(undefined as never);
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "NOT_CONNECTED";
      }

      if (selector === selectUserMetadataStatus) {
        return "loading";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });
  });

  it("returns checking state when metadata is still loading", () => {
    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe(
      "Checking Google Calendar…",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Checking Google Calendar status…",
    );
  });

  it("returns checking state when metadata is idle before refresh", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "NOT_CONNECTED";
      }

      if (selector === selectUserMetadataStatus) {
        return "idle";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.commandAction.label).toBe(
      "Checking Google Calendar…",
    );
  });

  it("returns connect state when metadata is loaded and Google is not connected", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "NOT_CONNECTED";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Google Calendar not connected. Click to connect.",
    );
  });

  it("returns connected state when metadata is healthy", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "HEALTHY";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe(
      "Google Calendar Connected",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.commandAction.onSelect).toBeUndefined();
    expect(result.current.sidebarStatus.isDisabled).toBe(true);
  });

  it("returns reconnect state when refresh token is missing", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "RECONNECT_REQUIRED";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe(
      "Reconnect Google Calendar",
    );

    result.current.commandAction.onSelect?.();

    expect(mockLogin).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("returns syncing state while import is running", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "IMPORTING";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe("Syncing Google Calendar…");
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.commandAction.onSelect).toBeUndefined();
    expect(result.current.sidebarStatus.isDisabled).toBe(true);
  });

  it("returns repair state when sync needs attention", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "ATTENTION";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe("Repair Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Google Calendar needs repair. Click to repair.",
    );

    result.current.sidebarStatus.dialog?.onRepair();

    expect(mockSyncApi.importGCal).toHaveBeenCalledWith({ force: true });
    expect(mockDispatch).toHaveBeenCalledWith(
      importGCalSlice.actions.clearImportResults(undefined),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      importGCalSlice.actions.startRepair(),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );

    jest.clearAllMocks();

    result.current.commandAction.onSelect?.();

    expect(mockSyncApi.importGCal).toHaveBeenCalledWith({ force: true });
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("returns repairing state while a repair is active", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "ATTENTION";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: true };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.commandAction.label).toBe(
      "Repairing Google Calendar…",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.sidebarStatus.iconColor).toBe("warning");
    expect(result.current.sidebarStatus.tone).toBe("warning");
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Repairing Google Calendar in the background.",
    );
    expect(result.current.sidebarStatus.isDisabled).toBe(true);
    expect(result.current.sidebarStatus.dialog).toBeDefined();
  });

  it("shows a toast and clears repair state when the repair request fails to start", async () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "ATTENTION";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });
    mockSyncApi.importGCal.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useConnectGoogle());

    result.current.commandAction.onSelect?.();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setImportError(
          "Google Calendar repair failed. Please try again.",
        ),
      ),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      importGCalSlice.actions.stopRepair(),
    );
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      "Google Calendar repair failed. Please try again.",
      { toastId: "google-repair-failed" },
    );
  });

  it("shows connect state when server says not connected", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "NOT_CONNECTED";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.isDisabled).toBe(false);
  });

  it("shows reconnect_required state from the server", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "RECONNECT_REQUIRED";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe(
      "Reconnect Google Calendar",
    );
    expect(result.current.commandAction.isDisabled).toBe(false);
  });

  it("returns connect state when metadata is missing for a never-authenticated user", () => {
    mockHasUserEverAuthenticated.mockReturnValue(false);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "NOT_CONNECTED";
      }

      if (selector === selectUserMetadataStatus) {
        return "idle";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expectGoogleAuthConfig();
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
  });

  it("connects Google through the backend endpoint and refreshes metadata", async () => {
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

    await useGoogleAuthArg.onSuccess(payload);

    expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
    expect(mockAuthApi.connectGoogle).toHaveBeenCalledWith(payload);
    expect(mockRefreshUserMetadata).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(triggerFetch());
  });

  it("shows the server message when Google connect fails and keeps the connect action visible", async () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleConnectionState) {
        return "NOT_CONNECTED";
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return { isRepairing: false };
      }

      return undefined;
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

    await expect(useGoogleAuthArg.onSuccess(payload)).resolves.toBe(false);

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      "Google account is already connected to another Compass user",
    );
    expect(mockRefreshUserMetadata).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(triggerFetch());
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
  });

  it("records synced local events before refreshing Google data", async () => {
    mockSyncPendingLocalEvents.mockImplementation((dispatch) => {
      dispatch(importGCalSlice.actions.setLocalEventsSynced(2));
      return Promise.resolve(true);
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

    await useGoogleAuthArg.onSuccess(payload);

    expect(mockDispatch).toHaveBeenCalledWith(
      importGCalSlice.actions.setLocalEventsSynced(2),
    );
    expect(mockAuthApi.connectGoogle).toHaveBeenCalledWith(payload);
  });

  it("does not connect Google when local event sync fails", async () => {
    const { showLocalEventsSyncFailure } = jest.requireActual<
      typeof GoogleAuthUtil
    >("@web/auth/google/google.auth.util");
    mockSyncPendingLocalEvents.mockImplementation(() => {
      showLocalEventsSyncFailure(new Error("sync failed"));
      return Promise.resolve(false);
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

    await useGoogleAuthArg.onSuccess(payload);

    expect(mockToastError).toHaveBeenCalled();
    expect(mockAuthApi.connectGoogle).not.toHaveBeenCalled();
    expect(mockRefreshUserMetadata).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(triggerFetch());
  });
});
