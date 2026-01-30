import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "@web/auth/hooks/useSession";
import { useGoogleLoginWithSyncOverlay } from "@web/common/hooks/useGoogleLoginWithSyncOverlay";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

jest.mock("@web/auth/hooks/useSession");
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
    let onStartCallback: (() => void) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onStart }) => {
      onStartCallback = onStart;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleLoginWithSyncOverlay());

    onStartCallback?.();

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

  it("clears isSyncing when popup is closed without completing auth", async () => {
    let onStartCallback: (() => void) | undefined;
    let currentLoading = true;

    mockUseGoogleLogin.mockImplementation(({ onStart }) => {
      onStartCallback = onStart;
      return {
        login: mockLogin,
        loading: currentLoading,
        data: null,
      };
    });

    const { rerender } = renderHook(() => useGoogleLoginWithSyncOverlay());

    onStartCallback?.();
    expect(mockSetIsSyncing).toHaveBeenCalledWith(true);

    mockSetIsSyncing.mockClear();

    currentLoading = false;
    mockUseGoogleLogin.mockImplementation(({ onStart }) => {
      onStartCallback = onStart;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    rerender();

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });
  });
});
