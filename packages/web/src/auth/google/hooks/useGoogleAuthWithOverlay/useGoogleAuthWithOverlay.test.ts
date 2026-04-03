import { renderHook, waitFor } from "@testing-library/react";
import { useGoogleAuthWithOverlay } from "@web/auth/google/hooks/useGoogleAuthWithOverlay/useGoogleAuthWithOverlay";
import { useGoogleLogin } from "@web/auth/google/hooks/useGoogleLogin/useGoogleLogin";
import { type GoogleAuthConfig } from "../googe.auth.types";

jest.mock("@web/auth/google/hooks/useGoogleLogin/useGoogleLogin");

const mockUseGoogleLogin = useGoogleLogin as jest.MockedFunction<
  typeof useGoogleLogin
>;

describe("useGoogleAuthWithOverlay", () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls onStart before login", () => {
    const onStart = jest.fn();

    mockUseGoogleLogin.mockReturnValue({
      login: mockLogin,
      loading: false,
      data: null,
    });

    const { result } = renderHook(() => useGoogleAuthWithOverlay({ onStart }));

    void result.current.login();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("calls onSuccess when Google login succeeds", async () => {
    let onSuccessCallback:
      | ((data: GoogleAuthConfig) => Promise<void>)
      | undefined;
    const onSuccess = jest.fn();

    mockUseGoogleLogin.mockImplementation(({ onSuccess: providedSuccess }) => {
      onSuccessCallback = providedSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuthWithOverlay({ onSuccess }));

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
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onError when Google login fails", () => {
    let onErrorCallback: ((error: unknown) => void) | undefined;
    const onError = jest.fn();

    mockUseGoogleLogin.mockImplementation(({ onError: providedError }) => {
      onErrorCallback = providedError;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuthWithOverlay({ onError }));

    onErrorCallback?.(new Error("Login failed"));

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("calls onError when popup fails to open synchronously", () => {
    const onError = jest.fn();
    const popupError = new Error("Failed to open popup window");
    const throwingLogin = jest.fn(() => {
      throw popupError;
    });

    mockUseGoogleLogin.mockReturnValue({
      login: throwingLogin,
      loading: false,
      data: null,
    });

    const { result } = renderHook(() => useGoogleAuthWithOverlay({ onError }));

    expect(() => result.current.login()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(popupError);
  });

  it("calls onError when onSuccess throws", async () => {
    let onSuccessCallback:
      | ((data: GoogleAuthConfig) => Promise<void>)
      | undefined;
    const onSuccess = jest.fn().mockRejectedValue(new Error("Auth failed"));
    const onError = jest.fn();

    mockUseGoogleLogin.mockImplementation(({ onSuccess: providedSuccess }) => {
      onSuccessCallback = providedSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuthWithOverlay({ onSuccess, onError }));

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
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });
});
