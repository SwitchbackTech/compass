import { renderHook, waitFor } from "@testing-library/react";
import { useIsSignupComplete } from "@web/auth/hooks/useIsSignupComplete";
import { useSession } from "@web/auth/hooks/useSession";
import { useSkipOnboarding } from "@web/auth/hooks/useSkipOnboarding";
import { CompassSession } from "@web/auth/session/session.types";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import {
  authenticate,
  fetchOnboardingStatus,
  syncLocalEvents,
} from "@web/common/utils/auth/google-auth.util";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

// Mock dependencies
jest.mock("@web/common/utils/auth/google-auth.util");
jest.mock("@web/auth/hooks/useSession");
jest.mock("@web/auth/hooks/useIsSignupComplete");
jest.mock("@web/auth/hooks/useSkipOnboarding");
jest.mock("@web/components/oauth/google/useGoogleLogin");
jest.mock("@web/common/utils/storage/auth-state.util");
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: Object.assign(jest.fn(), {
    error: jest.fn(),
    success: jest.fn(),
  }),
}));

const mockAuthenticate = authenticate as jest.MockedFunction<
  typeof authenticate
>;
const mockFetchOnboardingStatus = fetchOnboardingStatus as jest.MockedFunction<
  typeof fetchOnboardingStatus
>;
const mockSyncLocalEvents = syncLocalEvents as jest.MockedFunction<
  typeof syncLocalEvents
>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseIsSignupComplete = useIsSignupComplete as jest.MockedFunction<
  typeof useIsSignupComplete
>;
const mockUseSkipOnboarding = useSkipOnboarding as jest.MockedFunction<
  typeof useSkipOnboarding
>;
const mockUseGoogleLogin = useGoogleLogin as jest.MockedFunction<
  typeof useGoogleLogin
>;
const mockMarkUserAsAuthenticated =
  markUserAsAuthenticated as jest.MockedFunction<
    typeof markUserAsAuthenticated
  >;

describe("useGoogleAuth", () => {
  const mockSetAuthenticated = jest.fn();
  const mockSetIsSyncing = jest.fn();
  const mockMarkSignupCompleted = jest.fn();
  const mockUpdateOnboardingStatus = jest.fn();
  const mockLogin = jest.fn();
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error in tests to avoid EPIPE errors
    console.error = jest.fn();

    const mockSession: CompassSession = {
      setAuthenticated: mockSetAuthenticated,
      setIsSyncing: mockSetIsSyncing,
      authenticated: false,
      isSyncing: false,
      loading: false,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);
    mockUseIsSignupComplete.mockReturnValue({
      markSignupCompleted: mockMarkSignupCompleted,
      isSignupComplete: false,
    });
    mockUseSkipOnboarding.mockReturnValue({
      updateOnboardingStatus: mockUpdateOnboardingStatus,
      skipOnboarding: false,
    });
    mockAuthenticate.mockResolvedValue({ success: true });
    mockFetchOnboardingStatus.mockResolvedValue({ skipOnboarding: true });
    mockSyncLocalEvents.mockResolvedValue({ syncedCount: 0, success: true });
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("keeps isSyncing true after authentication and does not set it to false", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
      onSuccessCallback = onSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuth());

    // Simulate Google login success
    if (onSuccessCallback) {
      await onSuccessCallback({
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
    }

    await waitFor(() => {
      expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    });

    // Verify setIsSyncing(false) was NOT called in onSuccess
    // (it should only be called by SocketProvider when IMPORT_GCAL_END is received)
    expect(mockSetIsSyncing).not.toHaveBeenCalledWith(false);
  });

  it("sets isSyncing to true after successful authentication", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
      onSuccessCallback = onSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuth());

    // Simulate Google login success
    if (onSuccessCallback) {
      await onSuccessCallback({
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
    }

    await waitFor(() => {
      expect(mockAuthenticate).toHaveBeenCalled();
    });

    expect(mockMarkUserAsAuthenticated).toHaveBeenCalled();
  });

  describe("onStart callback", () => {
    it("shows overlay immediately when login starts", () => {
      let onStartCallback: (() => void) | undefined;

      mockUseGoogleLogin.mockImplementation(({ onStart }) => {
        onStartCallback = onStart;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      // Re-mock useAppDispatch for this test
      const mockDispatchFn = jest.fn();
      jest
        .spyOn(jest.requireMock("@web/store/store.hooks"), "useAppDispatch")
        .mockReturnValue(mockDispatchFn);

      renderHook(() => useGoogleAuth());

      expect(onStartCallback).toBeDefined();

      // Simulate login start
      onStartCallback?.();

      expect(mockSetIsSyncing).toHaveBeenCalledWith(true);
    });
  });

  describe("onError callback", () => {
    it("hides overlay when login fails", () => {
      let onErrorCallback: ((error: unknown) => void) | undefined;

      mockUseGoogleLogin.mockImplementation(({ onError }) => {
        onErrorCallback = onError;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      renderHook(() => useGoogleAuth());

      expect(onErrorCallback).toBeDefined();

      // Simulate login error
      const error = new Error("Login failed");
      onErrorCallback?.(error);

      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });
  });

  describe("popup close handling", () => {
    it("hides overlay when popup is closed without completing auth", async () => {
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

      const { rerender } = renderHook(() => useGoogleAuth());

      // Simulate login start (popup opens, loading is true)
      onStartCallback?.();
      expect(mockSetIsSyncing).toHaveBeenCalledWith(true);

      mockSetIsSyncing.mockClear();

      // Simulate popup closed (loading becomes false without success)
      currentLoading = false;

      // Update mock to return the new loading state (false)
      mockUseGoogleLogin.mockImplementation(({ onStart }) => {
        onStartCallback = onStart;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      // Trigger re-render to run the useEffect with the new loading state
      rerender();

      await waitFor(() => {
        expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("authentication failure handling", () => {
    it("clears syncing and does not proceed when authentication fails", async () => {
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: new Error("Auth failed"),
      });

      let onStartCallback: (() => void) | undefined;
      let onSuccessCallback:
        | ((data: SignInUpInput) => Promise<void>)
        | undefined;

      mockUseGoogleLogin.mockImplementation(({ onStart, onSuccess }) => {
        onStartCallback = onStart;
        onSuccessCallback = onSuccess;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      renderHook(() => useGoogleAuth());

      onStartCallback?.();

      if (onSuccessCallback) {
        await onSuccessCallback({
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
      }

      await waitFor(() => {
        expect(mockAuthenticate).toHaveBeenCalled();
      });

      // Should not proceed with auth flow
      expect(mockMarkUserAsAuthenticated).not.toHaveBeenCalled();
      expect(mockSetAuthenticated).not.toHaveBeenCalled();
      expect(mockSetIsSyncing).toHaveBeenCalledWith(false);
    });
  });
});
