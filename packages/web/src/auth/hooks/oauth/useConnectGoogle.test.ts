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
  let googleStatus = {
    connectionStatus: "not_connected" as const,
    syncStatus: "none" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseAppSelector.mockImplementation((selector) =>
      selector({
        auth: {
          status: "idle",
          error: null,
          google: googleStatus,
        },
      } as never),
    );
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
    });
    googleStatus = {
      connectionStatus: "not_connected",
      syncStatus: "none",
    };
  });

  it("returns connected state when Google sync is healthy", () => {
    googleStatus = {
      connectionStatus: "connected",
      syncStatus: "healthy",
    };

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.isGoogleCalendarConnected).toBe(true);
    expect(result.current.googleCalendarLabel).toBe(
      "Google Calendar Connected",
    );
  });

  it("shows reconnect label when Google token must be reconnected", () => {
    googleStatus = {
      connectionStatus: "reconnect_required",
      syncStatus: "none",
    };

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.isGoogleCalendarConnected).toBe(false);
    expect(result.current.googleCalendarLabel).toBe(
      "Reconnect Google Calendar",
    );
  });

  it("shows syncing label and disables actions while repairing", () => {
    googleStatus = {
      connectionStatus: "connected",
      syncStatus: "repairing",
    };

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.isGoogleCalendarConnected).toBe(false);
    expect(result.current.googleCalendarLabel).toBe(
      "Syncing Google Calendar...",
    );
    expect(result.current.isGoogleCalendarActionDisabled).toBe(true);
  });

  it("shows repair label when Google needs attention", () => {
    googleStatus = {
      connectionStatus: "connected",
      syncStatus: "attention",
    };

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.googleCalendarLabel).toBe("Repair Google Calendar");
    expect(result.current.isGoogleCalendarActionDisabled).toBe(false);
  });

  it("logs in and closes the command palette on connect", () => {
    const { result } = renderHook(() => useConnectGoogle());

    result.current.onConnectGoogleCalendar();

    expect(mockLogin).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });
});
