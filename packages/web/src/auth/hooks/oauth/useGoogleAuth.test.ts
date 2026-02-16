import { renderHook, waitFor } from "@testing-library/react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { useIsSignupComplete } from "@web/auth/hooks/onboarding/useIsSignupComplete";
import { useSkipOnboarding } from "@web/auth/hooks/onboarding/useSkipOnboarding";
import { useSession } from "@web/auth/hooks/session/useSession";
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
jest.mock("@web/auth/hooks/session/useSession");
jest.mock("@web/auth/hooks/onboarding/useIsSignupComplete");
jest.mock("@web/auth/hooks/onboarding/useSkipOnboarding");
jest.mock("@web/components/oauth/google/useGoogleLogin");
jest.mock("@web/common/utils/storage/auth-state.util");
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: Object.assign(jest.fn(), {
    dismiss: jest.fn(),
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
const mockUseAppDispatch = jest.requireMock("@web/store/store.hooks")
  .useAppDispatch as jest.Mock;
const mockMarkUserAsAuthenticated =
  markUserAsAuthenticated as jest.MockedFunction<
    typeof markUserAsAuthenticated
  >;

describe("useGoogleAuth", () => {
  const mockSetAuthenticated = jest.fn();
  const mockMarkSignupCompleted = jest.fn();
  const mockUpdateOnboardingStatus = jest.fn();
  const mockLogin = jest.fn();
  const originalConsoleError = console.error;
  let mockDispatchFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error in tests to avoid EPIPE errors
    console.error = jest.fn();
    mockDispatchFn = jest.fn();
    mockUseAppDispatch.mockReturnValue(mockDispatchFn);

    mockUseSession.mockReturnValue({
      setAuthenticated: mockSetAuthenticated,
      authenticated: false,
    });
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

  it("marks user as authenticated after successful login", async () => {
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
  });

  it("completes auth flow after successful authentication", async () => {
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
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  describe("onStart callback", () => {
    it("shows overlay immediately when login starts and clears session-expired toast", () => {
      mockUseGoogleLogin.mockReturnValue({
        login: mockLogin,
        loading: false,
        data: null,
      });

      const { result } = renderHook(() => useGoogleAuth());

      // Simulate login start
      result.current.login();

      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth/startAuthenticating" }),
      );
      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/setAwaitingImportResults",
          payload: true,
        }),
      );
      const { toast } = jest.requireMock("react-toastify");
      expect(toast.dismiss).toHaveBeenCalledWith("session-expired-api");
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

      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/setAwaitingImportResults",
          payload: false,
        }),
      );
      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/importing",
          payload: false,
        }),
      );
    });
  });

  describe("authentication failure handling", () => {
    it("clears import flow and does not proceed when authentication fails", async () => {
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: new Error("Auth failed"),
      });

      let onSuccessCallback:
        | ((data: SignInUpInput) => Promise<void>)
        | undefined;

      mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      renderHook(() => useGoogleAuth());

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
      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/setAwaitingImportResults",
          payload: false,
        }),
      );
    });

    it("clears import flow when authenticate throws an unexpected error", async () => {
      const authError = new Error("Network error");
      mockAuthenticate.mockRejectedValue(authError);

      let onSuccessCallback:
        | ((data: SignInUpInput) => Promise<void>)
        | undefined;

      mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      renderHook(() => useGoogleAuth());

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

      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/setAwaitingImportResults",
          payload: false,
        }),
      );

      // Should not proceed with auth flow
      expect(mockMarkUserAsAuthenticated).not.toHaveBeenCalled();
      expect(mockSetAuthenticated).not.toHaveBeenCalled();
    });

    it("clears import flow when other operations throw errors after OAuth succeeds", async () => {
      mockAuthenticate.mockResolvedValue({ success: true });
      const fetchError = new Error("Failed to fetch onboarding status");
      mockFetchOnboardingStatus.mockRejectedValue(fetchError);

      let onSuccessCallback:
        | ((data: SignInUpInput) => Promise<void>)
        | undefined;

      mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return {
          login: mockLogin,
          loading: false,
          data: null,
        };
      });

      renderHook(() => useGoogleAuth());

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

      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/setAwaitingImportResults",
          payload: false,
        }),
      );

      // Authentication succeeded, so these should be called
      expect(mockMarkUserAsAuthenticated).toHaveBeenCalled();
      expect(mockSetAuthenticated).toHaveBeenCalled();
    });
  });
});
