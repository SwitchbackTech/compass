import { renderHook } from "@testing-library/react";
import { useConnectGoogle } from "@web/auth/hooks/oauth/useConnectGoogle";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

jest.mock("@web/auth/hooks/oauth/useGoogleAuth");
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

describe("useConnectGoogle", () => {
  const mockDispatch = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
    });
    mockUseAppSelector.mockReturnValue(undefined);
  });

  it("returns connect state when metadata is missing", () => {
    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.label).toBe("Connect Google Calendar");
    expect(result.current.isDisabled).toBe(false);
  });

  it("returns connected state when metadata is healthy", () => {
    mockUseAppSelector.mockReturnValue({
      connectionStatus: "connected",
      syncStatus: "healthy",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.label).toBe("Google Calendar Connected");
    expect(result.current.onSelect).toBeUndefined();
  });

  it("returns reconnect state when refresh token is missing", () => {
    mockUseAppSelector.mockReturnValue({
      connectionStatus: "reconnect_required",
      syncStatus: "none",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.label).toBe("Reconnect Google Calendar");
    result.current.onSelect?.();

    expect(mockLogin).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("returns syncing state while repair is running", () => {
    mockUseAppSelector.mockReturnValue({
      connectionStatus: "connected",
      syncStatus: "repairing",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.label).toBe("Syncing Google Calendar...");
    expect(result.current.isDisabled).toBe(true);
    expect(result.current.onSelect).toBeUndefined();
  });

  it("returns repair state when sync needs attention", () => {
    mockUseAppSelector.mockReturnValue({
      connectionStatus: "connected",
      syncStatus: "attention",
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.label).toBe("Repair Google Calendar");

    result.current.onSelect?.();

    expect(mockLogin).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });
});
