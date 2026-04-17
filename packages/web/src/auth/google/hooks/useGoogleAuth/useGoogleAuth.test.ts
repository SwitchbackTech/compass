import { renderHook, waitFor } from "@testing-library/react";
import { type GoogleAuthConfig } from "../googe.auth.types";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const mockAuthenticate = mock();
const mockCompleteAuthentication = mock();
const mockDismissErrorToast = mock();
const mockDispatch = mock();
const mockLogin = mock();
const mockShowErrorToast = mock();
const mockShowSessionExpiredToast = mock();
const mockToast = Object.assign(mock(), {
  dismiss: mock(),
  error: mock(),
  success: mock(),
});
const mockUseAppDispatch = mock();
const mockUseCompleteAuthentication = mock();
const mockUseGoogleLogin = mock();

mock.module("@web/auth/google/util/google.auth.util", () => ({
  authenticate: mockAuthenticate,
  handleGoogleRevoked: mock(),
  showLocalEventsSyncFailure: mock(),
  syncLocalEvents: mock(),
  syncPendingLocalEvents: mock(),
}));

mock.module("@web/auth/compass/hooks/useCompleteAuthentication", () => ({
  useCompleteAuthentication: mockUseCompleteAuthentication,
}));

mock.module("@web/auth/google/hooks/useGoogleLogin/useGoogleLogin", () => ({
  useGoogleLogin: mockUseGoogleLogin,
}));

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  dismissErrorToast: mockDismissErrorToast,
  ErrorToastSeverity: {
    CRITICAL: "critical",
    DEFAULT: "default",
  },
  SESSION_EXPIRED_TOAST_ID: "session-expired-api",
  showErrorToast: mockShowErrorToast,
  showSessionExpiredToast: mockShowSessionExpiredToast,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: mockUseAppDispatch,
}));

mock.module("react-toastify", () => ({
  default: mockToast,
  toast: mockToast,
}));

const { useGoogleAuth } =
  require("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth") as typeof import("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth");

describe("useGoogleAuth", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    mockAuthenticate.mockClear();
    mockCompleteAuthentication.mockClear();
    mockDismissErrorToast.mockClear();
    mockShowErrorToast.mockClear();
    mockShowSessionExpiredToast.mockClear();
    mockDispatch.mockClear();
    mockLogin.mockClear();
    mockToast.mockClear();
    mockToast.dismiss.mockClear();
    mockToast.error.mockClear();
    mockToast.success.mockClear();
    mockUseAppDispatch.mockClear();
    mockUseCompleteAuthentication.mockClear();
    mockUseGoogleLogin.mockClear();

    console.error = mock();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseCompleteAuthentication.mockReturnValue(mockCompleteAuthentication);
    mockAuthenticate.mockResolvedValue({ success: true });
    mockCompleteAuthentication.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("completes authentication after successful login", async () => {
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
      expect(mockCompleteAuthentication).toHaveBeenCalledWith({
        email: undefined,
      });
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

    expect(mockCompleteAuthentication).toHaveBeenCalledTimes(1);
    expect(mockCompleteAuthentication).toHaveBeenCalledWith({
      email: undefined,
    });
  });

  describe("onStart callback", () => {
    it("shows overlay immediately when login starts", () => {
      mockUseGoogleLogin.mockReturnValue({
        login: mockLogin,
        loading: false,
        data: null,
      });

      const { result } = renderHook(() => useGoogleAuth());

      void result.current.login();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth/startAuthenticating" }),
      );
      expect(mockDismissErrorToast).toHaveBeenCalledWith("session-expired-api");
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
    const customOnSuccess = mock().mockResolvedValue(undefined);

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
    expect(mockCompleteAuthentication).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/authSuccess" }),
    );
  });

  it("resets auth when a custom success handler returns false", async () => {
    let onSuccessCallback:
      | ((data: GoogleAuthConfig) => Promise<boolean | undefined>)
      | undefined;
    const customOnSuccess = mock().mockResolvedValue(false);

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
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/resetAuth" }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
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

      const error = new Error("Login failed");
      onErrorCallback?.(error);

      expect(mockDispatch).toHaveBeenCalledWith(
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
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "auth/resetAuth",
        }),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
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

      expect(mockCompleteAuthentication).not.toHaveBeenCalled();

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

      expect(mockCompleteAuthentication).not.toHaveBeenCalled();

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

      expect(mockCompleteAuthentication).not.toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  mock.restore();
});
