import { usePostHog } from "posthog-js/react";
import { act } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { AuthApi } from "@web/common/apis/auth.api";
import { LoginView } from "./Login";

// Mock PostHog
jest.mock("posthog-js/react");
const mockUsePostHog = usePostHog as jest.MockedFunction<typeof usePostHog>;

// Mock AuthApi
jest.mock("@web/common/apis/auth.api");
const mockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;

// Mock useGoogleLogin hook
jest.mock("@web/components/oauth/google/useGoogleLogin", () => ({
  useGoogleLogin: jest.fn(),
}));

// Mock useAuthCheck hook
jest.mock("@web/auth/useAuthCheck", () => ({
  useAuthCheck: () => ({
    isAuthenticated: false,
    isCheckingAuth: false,
    isGoogleTokenActive: false,
    isSessionActive: false,
  }),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("LoginView", () => {
  const mockIdentify = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Default mock implementations
    mockUsePostHog.mockReturnValue({
      identify: mockIdentify,
    } as any);

    mockAuthApi.loginOrSignup.mockResolvedValue({
      cUserId: "test-user-id",
      isNewUser: false,
      email: "test@example.com",
    });

    // Mock useGoogleLogin hook
    const {
      useGoogleLogin,
    } = require("@web/components/oauth/google/useGoogleLogin");
    useGoogleLogin.mockReturnValue({
      login: mockLogin,
      data: null,
      loading: false,
    });
  });

  describe("Authentication Flow", () => {
    it("should call AuthApi.loginOrSignup with OAuth code", async () => {
      render(<LoginView />);

      const {
        useGoogleLogin,
      } = require("@web/components/oauth/google/useGoogleLogin");
      const mockUseGoogleLogin = useGoogleLogin as jest.Mock;
      const onSuccessCallback = mockUseGoogleLogin.mock.calls[0][0].onSuccess;

      await onSuccessCallback("test-oauth-code");

      expect(mockAuthApi.loginOrSignup).toHaveBeenCalledWith("test-oauth-code");
    });

    it("should log authentication errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockAuthApi.loginOrSignup.mockRejectedValue(new Error("Auth failed"));

      render(<LoginView />);

      const {
        useGoogleLogin,
      } = require("@web/components/oauth/google/useGoogleLogin");
      const mockUseGoogleLogin = useGoogleLogin as jest.Mock;
      const onErrorCallback = mockUseGoogleLogin.mock.calls[0][0].onError;

      // Simulate error
      onErrorCallback(new Error("Auth failed"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  it("renders Google sign-in and triggers login on click", async () => {
    render(<LoginView />);
    const btn = screen.getByRole("button");
    await act(async () => {
      await userEvent.click(btn);
    });
    expect(mockLogin).toHaveBeenCalled();
  });
});
