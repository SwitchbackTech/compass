import { usePostHog } from "posthog-js/react";
import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
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

// Mock WaitlistApi
jest.mock("@web/common/apis/waitlist.api", () => ({
  WaitlistApi: {
    getWaitlistStatus: jest.fn(),
  },
}));

describe("LoginView", () => {
  const mockIdentify = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe("PostHog Integration", () => {
    it("should call posthog.identify with email after successful authentication", async () => {
      const testEmail = "test@example.com";
      mockAuthApi.loginOrSignup.mockResolvedValue({
        cUserId: "user123",
        isNewUser: false,
        email: testEmail,
      });

      render(<LoginView />);

      // Simulate successful Google login
      const {
        useGoogleLogin,
      } = require("@web/components/oauth/google/useGoogleLogin");
      const mockUseGoogleLogin = useGoogleLogin as jest.Mock;

      // Get the onSuccess callback from the mocked hook
      const onSuccessCallback = mockUseGoogleLogin.mock.calls[0][0].onSuccess;

      // Call the onSuccess callback with a mock OAuth code
      await onSuccessCallback("mock-oauth-code");

      // Verify PostHog identify was called with correct parameters
      expect(mockIdentify).toHaveBeenCalledWith(testEmail, {
        email: testEmail,
      });
      expect(mockAuthApi.loginOrSignup).toHaveBeenCalledWith("mock-oauth-code");
    });

    it("should call posthog.identify for new user signup", async () => {
      const testEmail = "newuser@example.com";
      mockAuthApi.loginOrSignup.mockResolvedValue({
        cUserId: "new-user-id",
        isNewUser: true,
        email: testEmail,
      });

      render(<LoginView />);

      const {
        useGoogleLogin,
      } = require("@web/components/oauth/google/useGoogleLogin");
      const mockUseGoogleLogin = useGoogleLogin as jest.Mock;
      const onSuccessCallback = mockUseGoogleLogin.mock.calls[0][0].onSuccess;

      await onSuccessCallback("mock-oauth-code");

      // Verify PostHog identify was called for new user
      expect(mockIdentify).toHaveBeenCalledWith(testEmail, {
        email: testEmail,
      });
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

  describe("Waitlist Flow", () => {
    it("should handle waitlist status check", async () => {
      // Mock window.location to not be localhost
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        hostname: "example.com",
      } as any;

      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: true,
      });

      render(<LoginView />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const submitButton = screen.getByText("Check Waitlist Status");

      await act(async () => {
        await userEvent.type(emailInput, "test@example.com");
      });
      await act(async () => {
        await userEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "test@example.com",
        );
      });

      // Restore original location
      window.location = originalLocation;
    });
  });
});
