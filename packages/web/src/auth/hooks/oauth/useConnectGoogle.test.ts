import { renderHook } from "@testing-library/react";
import { useConnectGoogle } from "@web/auth/hooks/oauth/useConnectGoogle";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { useSession } from "@web/auth/hooks/session/useSession";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";

jest.mock("@web/auth/hooks/session/useSession");
jest.mock("@web/auth/hooks/oauth/useGoogleAuth");
jest.mock("@web/store/store.hooks");

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<
  typeof useGoogleAuth
>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<
  typeof useAppDispatch
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
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });
  });

  it("returns true when Google Calendar is connected", () => {
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: jest.fn(),
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.isGoogleCalendarConnected).toBe(true);
  });

  it("returns false when Google Calendar is not connected", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.isGoogleCalendarConnected).toBe(false);
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
