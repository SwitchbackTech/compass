import { usePostHog } from "posthog-js/react";
import Session from "supertokens-auth-react/recipe/session";
import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import { UserProvider } from "./UserProvider";

// Mock PostHog
jest.mock("posthog-js/react");
const mockUsePostHog = usePostHog as jest.MockedFunction<typeof usePostHog>;

// Mock SuperTokens Session
jest.mock("supertokens-auth-react/recipe/session");
const mockSession = Session as jest.Mocked<typeof Session>;

// Mock AbsoluteOverflowLoader
jest.mock("@web/components/AbsoluteOverflowLoader", () => ({
  AbsoluteOverflowLoader: () => <div>Loading...</div>,
}));

describe("UserProvider", () => {
  const mockIdentify = jest.fn();
  const mockGetAccessTokenPayloadSecurely = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockSession.getAccessTokenPayloadSecurely =
      mockGetAccessTokenPayloadSecurely;
  });

  describe("PostHog Integration", () => {
    it("should call posthog.identify when PostHog is enabled and user data is available", async () => {
      const testUserId = "test-user-123";
      const testEmail = "test@example.com";

      // Mock session with userId and email
      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        sub: testUserId,
        email: testEmail,
      });

      // Mock PostHog as enabled
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      // Wait for async data fetch and PostHog identify to be called
      await waitFor(() => {
        expect(mockIdentify).toHaveBeenCalledWith(testEmail, {
          email: testEmail,
          userId: testUserId,
        });
      });

      // Verify it was called exactly once
      expect(mockIdentify).toHaveBeenCalledTimes(1);
    });

    it("should NOT call posthog.identify when PostHog is disabled", async () => {
      const testUserId = "test-user-123";
      const testEmail = "test@example.com";

      // Mock session with userId and email
      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        sub: testUserId,
        email: testEmail,
      });

      // Mock PostHog as disabled (returns undefined/null)
      mockUsePostHog.mockReturnValue(undefined as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      // Wait a bit to ensure no identify call happens
      await waitFor(() => {
        expect(mockGetAccessTokenPayloadSecurely).toHaveBeenCalled();
      });

      // Verify identify was never called
      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should NOT call posthog.identify when email is missing from session", async () => {
      const testUserId = "test-user-123";

      // Mock session with userId but NO email
      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        sub: testUserId,
        // email is missing
      });

      // Mock PostHog as enabled
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      // Wait for data fetch
      await waitFor(() => {
        expect(mockGetAccessTokenPayloadSecurely).toHaveBeenCalled();
      });

      // Verify identify was not called because email is missing
      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should NOT call posthog.identify when userId is missing", async () => {
      const testEmail = "test@example.com";

      // Mock session with email but NO userId (sub)
      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        email: testEmail,
        // sub is missing
      });

      // Mock PostHog as enabled
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      // The component should show loading state because userId is null
      // and identify should never be called
      await waitFor(() => {
        expect(mockGetAccessTokenPayloadSecurely).toHaveBeenCalled();
      });

      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should handle posthog.identify not being a function gracefully", async () => {
      const testUserId = "test-user-123";
      const testEmail = "test@example.com";

      // Mock session with userId and email
      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        sub: testUserId,
        email: testEmail,
      });

      // Mock PostHog with identify not being a function
      mockUsePostHog.mockReturnValue({
        identify: null,
      } as any);

      // Should not throw an error
      expect(() => {
        render(
          <UserProvider>
            <div>Test Child</div>
          </UserProvider>,
        );
      }).not.toThrow();

      await waitFor(() => {
        expect(mockGetAccessTokenPayloadSecurely).toHaveBeenCalled();
      });

      // Verify identify was not called
      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should render children after user data is loaded", async () => {
      const testUserId = "test-user-123";
      const testEmail = "test@example.com";

      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        sub: testUserId,
        email: testEmail,
      });

      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      const { getByText } = render(
        <UserProvider>
          <div>Test Child Content</div>
        </UserProvider>,
      );

      // Initially should show loading
      expect(getByText("Loading...")).toBeInTheDocument();

      // After data loads, should show children
      await waitFor(() => {
        expect(getByText("Test Child Content")).toBeInTheDocument();
      });
    });

    it("should handle session fetch errors gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock session to throw an error
      mockGetAccessTokenPayloadSecurely.mockRejectedValue(
        new Error("Session error"),
      );

      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      // Should log error
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to get user because:",
          expect.any(Error),
        );
      });

      // Should not call identify
      expect(mockIdentify).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
