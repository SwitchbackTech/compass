import { renderHook } from "@testing-library/react";
import { useSession } from "@web/auth/hooks/useSession";
import { useConnectGoogle } from "@web/common/hooks/useConnectGoogle";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";

jest.mock("@web/auth/hooks/useSession");
jest.mock("@web/common/hooks/useGoogleAuth");
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
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
    });
  });

  it("returns true when Google Calendar is connected", () => {
    mockUseSession.mockReturnValue({
      authenticated: true,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
    });

    const { result } = renderHook(() => useConnectGoogle());

    expect(result.current.isGoogleCalendarConnected).toBe(true);
  });

  it("returns false when Google Calendar is not connected", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
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
