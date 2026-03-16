import { renderHook } from "@testing-library/react";
import { useConnectGoogle } from "@web/auth/hooks/oauth/useConnectGoogle";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { SyncApi } from "@web/common/apis/sync.api";
import {
  selectGoogleMetadata,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import { selectImportGCalState } from "@web/ducks/events/selectors/sync.selector";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

jest.mock("@web/auth/hooks/oauth/useGoogleAuth");
jest.mock("@web/auth/state/auth.state.util");
jest.mock("@web/common/apis/sync.api");
jest.mock("@web/store/store.hooks");

const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<
  typeof useGoogleAuth
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
const mockSyncApi = SyncApi as jest.Mocked<typeof SyncApi>;

describe("useConnectGoogle", () => {
  const mockDispatch = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
      data: null,
      loading: false,
    });
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockSyncApi.importGCal.mockResolvedValue(undefined as never);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return undefined;
      }

      if (selector === selectUserMetadataStatus) {
        return "loading";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });
  });

  it("returns checking state when metadata is still loading", () => {
    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe(
      "Checking Google Calendar…",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.sidebarStatus.icon).toBe("SpinnerIcon");
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Checking Google Calendar status…",
    );
  });

  it("returns connect state when metadata is loaded and Google is not connected", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "NOT_CONNECTED",
          syncStatus: "NONE",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.icon).toBe("CloudArrowUpIcon");
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Google Calendar not connected. Click to connect.",
    );
  });

  it("returns connected state when metadata is healthy", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "CONNECTED",
          syncStatus: "HEALTHY",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe(
      "Google Calendar Connected",
    );
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.commandAction.onSelect).toBeUndefined();
    expect(result.current.sidebarStatus.icon).toBe("LinkIcon");
    expect(result.current.sidebarStatus.isDisabled).toBe(true);
  });

  it("returns reconnect state when refresh token is missing", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "RECONNECT_REQUIRED",
          syncStatus: "NONE",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe(
      "Reconnect Google Calendar",
    );
    expect(result.current.sidebarStatus.icon).toBe("LinkBreakIcon");
    result.current.commandAction.onSelect?.();

    expect(mockLogin).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("returns syncing state while repair is running", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "CONNECTED",
          syncStatus: "REPAIRING",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe("Syncing Google Calendar…");
    expect(result.current.commandAction.isDisabled).toBe(true);
    expect(result.current.commandAction.onSelect).toBeUndefined();
    expect(result.current.sidebarStatus.icon).toBe("SpinnerIcon");
    expect(result.current.sidebarStatus.isDisabled).toBe(true);
  });

  it("returns repair state when sync needs attention", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "CONNECTED",
          syncStatus: "ATTENTION",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe("Repair Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.icon).toBe("CloudWarningIcon");
    expect(result.current.sidebarStatus.tooltip).toBe(
      "Google Calendar needs repair. Click to repair.",
    );

    result.current.sidebarStatus.onSelect?.();

    expect(mockSyncApi.importGCal).toHaveBeenCalledWith({ force: true });
    expect(mockDispatch).toHaveBeenCalledWith(
      importGCalSlice.actions.clearImportResults(undefined),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      importGCalSlice.actions.setIsImportPending(true),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );

    jest.clearAllMocks();

    result.current.commandAction.onSelect?.();

    expect(mockSyncApi.importGCal).toHaveBeenCalledWith({ force: true });
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("waits for server import state instead of treating pending repair as syncing", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "NOT_CONNECTED",
          syncStatus: "NONE",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: true,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
    expect(result.current.commandAction.isDisabled).toBe(false);
    expect(result.current.sidebarStatus.icon).toBe("CloudArrowUpIcon");
    expect(result.current.sidebarStatus.isDisabled).toBe(false);
  });

  it("prioritizes reconnect_required over importing state", () => {
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return {
          connectionStatus: "RECONNECT_REQUIRED",
          syncStatus: "NONE",
        };
      }

      if (selector === selectUserMetadataStatus) {
        return "loaded";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: true,
          isImportPending: true,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe(
      "Reconnect Google Calendar",
    );
    expect(result.current.sidebarStatus.icon).toBe("LinkBreakIcon");
    expect(result.current.commandAction.isDisabled).toBe(false);
  });

  it("returns connect state when metadata is missing for a never-authenticated user", () => {
    mockHasUserEverAuthenticated.mockReturnValue(false);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectGoogleMetadata) {
        return undefined;
      }

      if (selector === selectUserMetadataStatus) {
        return "idle";
      }

      if (selector === selectImportGCalState) {
        return {
          importing: false,
          isImportPending: false,
        };
      }

      return undefined;
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(mockUseGoogleAuth).toHaveBeenCalledWith({
      prompt: "consent",
      shouldTryLinkingWithSessionUser: true,
    });
    expect(result.current.commandAction.label).toBe("Connect Google Calendar");
    expect(result.current.sidebarStatus.icon).toBe("CloudArrowUpIcon");
  });
});
