import { renderHook, waitFor } from "@testing-library/react";
import { useGoogleAuthWithOverlay } from "@web/auth/hooks/oauth/useGoogleAuthWithOverlay";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

jest.mock("@web/components/oauth/google/useGoogleLogin");

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

    result.current.login();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("calls onSuccess when Google login succeeds", async () => {
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

  it("calls onError when onSuccess throws", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;
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
