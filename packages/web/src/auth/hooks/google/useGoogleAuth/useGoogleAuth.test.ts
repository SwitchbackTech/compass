import { toast } from "react-toastify";
import { renderHook, waitFor } from "@testing-library/react";
import {
  authenticate,
  syncLocalEvents,
} from "@web/auth/google/google.auth.util";
import { useGoogleAuth } from "@web/auth/hooks/google/useGoogleAuth/useGoogleAuth";
import { useGoogleLogin } from "@web/auth/hooks/google/useGoogleLogin/useGoogleLogin";
import { useSession } from "@web/auth/hooks/session/useSession";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { markUserAsAuthenticated } from "@web/auth/state/auth.state.util";
import { useAppDispatch } from "@web/store/store.hooks";
import { type GoogleAuthConfig } from "../googe.auth.types";

// Mock dependencies
jest.mock("@web/auth/google/google.auth.util");
jest.mock("@web/auth/hooks/session/useSession");
jest.mock("@web/auth/session/user-metadata.util");
jest.mock("@web/auth/hooks/google/useGoogleLogin/useGoogleLogin");
jest.mock("@web/auth/state/auth.state.util");
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
const mockSyncLocalEvents = syncLocalEvents as jest.MockedFunction<
  typeof syncLocalEvents
>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseGoogleLogin = useGoogleLogin as jest.MockedFunction<
  typeof useGoogleLogin
>;
const mockRefreshUserMetadata = refreshUserMetadata as jest.MockedFunction<
  typeof refreshUserMetadata
>;
const mockToast = jest.mocked(toast);
const mockUseAppDispatch = jest.mocked(useAppDispatch);
const mockMarkUserAsAuthenticated =
  markUserAsAuthenticated as jest.MockedFunction<
    typeof markUserAsAuthenticated
  >;

describe("useGoogleAuth", () => {
  const mockSetAuthenticated = jest.fn();
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
    mockAuthenticate.mockResolvedValue({ success: true });
    mockSyncLocalEvents.mockResolvedValue({ syncedCount: 0, success: true });
    mockRefreshUserMetadata.mockResolvedValue();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("marks user as authenticated after successful login", async () => {
    let onSuccessCallback:
      | ((data: GoogleAuthConfig) => Promise<void>)
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
    let onSuccessCallback:
      | ((data: GoogleAuthConfig) => Promise<void>)
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
    expect(mockRefreshUserMetadata).toHaveBeenCalledTimes(1);
    expect(mockDispatchFn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/authSuccess" }),
    );
  });

  describe("onStart callback", () => {
    it("shows overlay immediately when login starts and clears prior import results", () => {
      mockUseGoogleLogin.mockReturnValue({
        login: mockLogin,
        loading: false,
        data: null,
      });

      const { result } = renderHook(() => useGoogleAuth());

      // Simulate login start
      void result.current.login();

      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth/startAuthenticating" }),
      );
      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "async/importGCal/clearImportResults",
        }),
      );
      expect(mockToast.dismiss).toHaveBeenCalledWith("session-expired-api");
    });
  });

  it("passes the session-link flag through to Google login setup", () => {
    mockUseGoogleLogin.mockReturnValue({
      login: mockLogin,
      loading: false,
      data: null,
    });

    renderHook(() =>
      useGoogleAuth({
        prompt: "consent",
        shouldTryLinkingWithSessionUser: true,
      }),
    );

    expect(mockUseGoogleLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "consent",
        shouldTryLinkingWithSessionUser: true,
      }),
    );
  });

  it("runs a custom success handler instead of the default sign-in flow", async () => {
    let onSuccessCallback:
      | ((data: GoogleAuthConfig) => Promise<void>)
      | undefined;
    const customOnSuccess = jest.fn().mockResolvedValue(undefined);

    mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
      onSuccessCallback = onSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() =>
      useGoogleAuth({
        onSuccess: customOnSuccess,
        prompt: "consent",
      }),
    );

    if (!onSuccessCallback) {
      throw new Error("Expected onSuccess callback to be registered");
    }

    const payload: GoogleAuthConfig = {
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
    };

    await onSuccessCallback(payload);

    expect(customOnSuccess).toHaveBeenCalledWith(payload);
    expect(mockAuthenticate).not.toHaveBeenCalled();
    expect(mockSetAuthenticated).not.toHaveBeenCalled();
    expect(mockDispatchFn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/authSuccess" }),
    );
  });

  describe("onError callback", () => {
    it("dispatches auth error when login fails", () => {
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
          type: "auth/authError",
        }),
      );
    });

    it("treats popup-closed as cancellation without auth error", () => {
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

      onErrorCallback?.({ type: "popup_closed" });

      expect(console.error).not.toHaveBeenCalled();
      expect(mockDispatchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "auth/resetAuth",
        }),
      );
      expect(mockDispatchFn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "auth/authError",
        }),
      );
    });
  });

  describe("authentication failure handling", () => {
    it("does not proceed when authentication fails", async () => {
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: new Error("Auth failed"),
      });

      let onSuccessCallback:
        | ((data: GoogleAuthConfig) => Promise<void>)
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

      // Should show error toast so user knows what went wrong
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to connect Google Calendar. Please try again.",
        expect.anything(),
      );
    });

    it("shows error toast and resets auth when SuperTokens returns non-OK status", async () => {
      mockAuthenticate.mockResolvedValue({
        success: true,
        data: { status: "SIGN_IN_UP_NOT_ALLOWED" } as never,
      });

      let onSuccessCallback:
        | ((data: GoogleAuthConfig) => Promise<void>)
        | undefined;

      mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
        onSuccessCallback = onSuccess;
        return { login: mockLogin, loading: false, data: null };
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

      expect(mockMarkUserAsAuthenticated).not.toHaveBeenCalled();
      expect(mockSetAuthenticated).not.toHaveBeenCalled();

      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not link Google Calendar to your account. Please try again.",
        expect.anything(),
      );
    });

    it("does not proceed when authenticate throws an unexpected error", async () => {
      const authError = new Error("Network error");
      mockAuthenticate.mockRejectedValue(authError);

      let onSuccessCallback:
        | ((data: GoogleAuthConfig) => Promise<void>)
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
    });
  });
});
