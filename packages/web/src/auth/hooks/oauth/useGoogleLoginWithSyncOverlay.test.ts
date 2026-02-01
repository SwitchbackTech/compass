import { renderHook, waitFor } from "@testing-library/react";
import { useGoogleLoginWithSyncOverlay } from "@web/auth/hooks/oauth/useGoogleLoginWithSyncOverlay";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

jest.mock("@web/auth/hooks/session/useSession");
jest.mock("@web/components/oauth/google/useGoogleLogin");

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseGoogleLogin = useGoogleLogin as jest.MockedFunction<
  typeof useGoogleLogin
>;

describe("useGoogleLoginWithSyncOverlay", () => {
  const mockSetIsSyncing = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      authenticated: false,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: mockSetIsSyncing,
    });
  });

  it("sets isSyncing true on start", () => {
    mockUseGoogleLogin.mockReturnValue({
      login: mockLogin,
      loading: false,
      data: null,
    });

    const { result } = renderHook(() => useGoogleLoginWithSyncOverlay());

    result.current.login();

    expect(mockSetIsSyncing).toHaveBeenCalledWith(true);
  });

  it("calls onSuccess and clears isSyncing by default", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;
    const onSuccess = jest.fn();

    mockUseGoogleLogin.mockImplementation(({ onSuccess: providedSuccess }) => {
      onSuccessCallback = providedSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleLoginWithSyncOverlay({ onSuccess }));

    await onSuccessCallback?.({
      clientType: "web",
      thirdPartyId: "google",
      redirectURIInfo: {
        redirectURIOnProviderDashboard: "",
        redirectURIQueryParams: {
          code: "test-auth-code",
          scope: "email profile",
          state: undefined,
        },
      },
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });
  });

  it("does not clear isSyncing when isSyncingRetainedOnSuccess is true", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onSuccess: providedSuccess }) => {
      onSuccessCallback = providedSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() =>
      useGoogleLoginWithSyncOverlay({ isSyncingRetainedOnSuccess: true }),
    );

    await onSuccessCallback?.({
      clientType: "web",
      thirdPartyId: "google",
      redirectURIInfo: {
        redirectURIOnProviderDashboard: "",
        redirectURIQueryParams: {
          code: "test-auth-code",
          scope: "email profile",
          state: undefined,
        },
      },
    });

    expect(mockSetIsSyncing).not.toHaveBeenCalledWith(false);
  });

  it("clears isSyncing on error", () => {
    let onErrorCallback: ((error: unknown) => void) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onError }) => {
      onErrorCallback = onError;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleLoginWithSyncOverlay());

    onErrorCallback?.(new Error("Login failed"));

    expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
  });

  it("clears isSyncing when popup is closed without completing auth", () => {
    let onErrorCallback: ((error: unknown) => void) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onError }) => {
      onErrorCallback = onError;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    const { result } = renderHook(() => useGoogleLoginWithSyncOverlay());

    result.current.login();
    mockSetIsSyncing.mockClear();

    onErrorCallback?.(new Error("Popup closed"));

    expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
  });

  it("clears isSyncing when component unmounts during login", () => {
    mockUseGoogleLogin.mockReturnValue({
      login: mockLogin,
      loading: true,
      data: null,
    });

    const { result, unmount } = renderHook(() =>
      useGoogleLoginWithSyncOverlay(),
    );

    result.current.login();
    expect(mockSetIsSyncing).toHaveBeenCalledWith(true);

    mockSetIsSyncing.mockClear();

    // Unmount while login is in progress
    unmount();

    // Cleanup should clear isSyncing
    expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
  });

  describe("error handling in onSuccess", () => {
    it("clears isSyncing when onSuccess throws an error with isSyncingRetainedOnSuccess=true", async () => {
      let onSuccessCallback:
        | ((data: SignInUpInput) => Promise<void>)
        | undefined;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let onErrorCallback: ((error: unknown) => void) | undefined;
      const onSuccess = jest.fn().mockRejectedValue(new Error("Auth failed"));
      const onError = jest.fn();

      mockUseGoogleLogin.mockImplementation(
        ({ onSuccess: providedSuccess, onError: providedError }) => {
          onSuccessCallback = providedSuccess;
          onErrorCallback = providedError;
          return {
            login: mockLogin,
            loading: false,
            data: null,
          };
        },
      );

      renderHook(() =>
        useGoogleLoginWithSyncOverlay({
          isSyncingRetainedOnSuccess: true,
          onSuccess,
          onError,
        }),
      );

      await onSuccessCallback?.({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard: "",
          redirectURIQueryParams: {
            code: "test-auth-code",
            scope: "email profile",
            state: undefined,
          },
        },
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Even with isSyncingRetainedOnSuccess=true, should clear on error
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
      // onError should be called
      expect(onError).toHaveBeenCalled();
    });

    it("clears isSyncing when onSuccess throws an error by default", async () => {
      let onSuccessCallback:
        | ((data: SignInUpInput) => Promise<void>)
        | undefined;
      const onSuccess = jest.fn().mockRejectedValue(new Error("Auth failed"));
      const onError = jest.fn();

      mockUseGoogleLogin.mockImplementation(
        ({ onSuccess: providedSuccess }) => {
          onSuccessCallback = providedSuccess;
          return {
            login: mockLogin,
            loading: false,
            data: null,
          };
        },
      );

      renderHook(() =>
        useGoogleLoginWithSyncOverlay({
          onSuccess,
          onError,
        }),
      );

      await onSuccessCallback?.({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard: "",
          redirectURIQueryParams: {
            code: "test-auth-code",
            scope: "email profile",
            state: undefined,
          },
        },
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Should clear isSyncing on error
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
      // onError should be called
      expect(onError).toHaveBeenCalled();
    });
  });
});
