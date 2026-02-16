import { rest } from "msw";
import { usePostHog } from "posthog-js/react";
import { act } from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Status } from "@core/errors/status.codes";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { UserProvider } from "@web/auth/context/UserProvider";
import { UserApi } from "@web/common/apis/user.api";
import { ENV_WEB } from "@web/common/constants/env.constants";
import * as authStateUtil from "@web/common/utils/storage/auth-state.util";

// Mock PostHog
jest.mock("posthog-js/react");
const mockUsePostHog = usePostHog as jest.MockedFunction<typeof usePostHog>;

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

// Mock auth state util
jest.mock("@web/common/utils/storage/auth-state.util", () => ({
  ...jest.requireActual("@web/common/utils/storage/auth-state.util"),
  hasUserEverAuthenticated: jest.fn(),
}));
const mockHasUserEverAuthenticated =
  authStateUtil.hasUserEverAuthenticated as jest.MockedFunction<
    typeof authStateUtil.hasUserEverAuthenticated
  >;

// Mock AbsoluteOverflowLoader
jest.mock("@web/components/AbsoluteOverflowLoader", () => ({
  AbsoluteOverflowLoader: () => <div>Loading...</div>,
}));

describe("UserProvider", () => {
  const mockIdentify = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to authenticated so existing tests continue to work
    mockHasUserEverAuthenticated.mockReturnValue(true);
  });

  describe("PostHog Integration", () => {
    it("should call posthog.identify when PostHog is enabled and user data is available", async () => {
      const testUserId = "test-user-123";
      const testEmail = "test@example.com";

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
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      expect(mockIdentify).toHaveBeenCalledWith(testEmail, {
        email: testEmail,
        userId: testUserId,
      });

      // Verify it was called exactly once
      expect(mockIdentify).toHaveBeenCalledTimes(1);
    });

    it("should NOT call posthog.identify when PostHog is disabled", async () => {
      // Mock PostHog as disabled (returns undefined/null)
      mockUsePostHog.mockReturnValue(undefined as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      // Verify identify was never called
      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should NOT call posthog.identify when email is missing from session", async () => {
      server.use(
        rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
          return res(
            ctx.status(Status.OK),
            ctx.json({ userId: "test-user-123" }),
          );
        }),
      );

      // Mock PostHog as enabled
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      // Verify identify was not called because email is missing
      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should NOT call posthog.identify when userId is missing", async () => {
      const getProfileSpy = jest.spyOn(UserApi, "getProfile");
      server.use(
        rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
          return res(
            ctx.status(Status.OK),
            ctx.json({ email: "test@example.com" }),
          );
        }),
      );

      // Mock PostHog as enabled
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
      await act(async () => {
        await getProfileSpy.mock.results[0].value;
      });

      expect(mockIdentify).not.toHaveBeenCalled();
      getProfileSpy.mockRestore();
    });

    it("should handle posthog.identify not being a function gracefully", async () => {
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
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      // Verify identify was not called
      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it("should render children after user data is loaded", async () => {
      server.use(
        rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
          return waitFor(
            () =>
              res(
                ctx.status(Status.OK),
                ctx.json({
                  userId: "test-user-123",
                  email: "test@example.com",
                }),
              ),
            { timeout: 100 },
          );
        }),
      );

      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child Content</div>
        </UserProvider>,
      );

      // Initially should show loading
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // After data loads, should show children
      await waitFor(() => {
        expect(screen.getByText("Test Child Content")).toBeInTheDocument();
      });
    });

    it("shows a login toast when profile fetch returns unauthorized", async () => {
      const getProfileSpy = jest.spyOn(UserApi, "getProfile");
      server.use(
        rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
          return res(ctx.status(Status.UNAUTHORIZED));
        }),
      );

      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
      await act(async () => {
        try {
          await getProfileSpy.mock.results[0].value;
        } catch (e) {
          // Ignore error
        }
      });

      expect(mockToastError).toHaveBeenCalledWith(
        "Session expired. Please log in again to reconnect Google Calendar.",
        expect.objectContaining({
          toastId: "session-expired-api",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
        }),
      );

      // Should not call identify
      expect(mockIdentify).not.toHaveBeenCalled();

      getProfileSpy.mockRestore();
    });
  });

  describe("Authentication Gating", () => {
    it("should NOT call getProfile when user has never authenticated", async () => {
      mockHasUserEverAuthenticated.mockReturnValue(false);
      const getProfileSpy = jest.spyOn(UserApi, "getProfile");
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      expect(getProfileSpy).not.toHaveBeenCalled();
      getProfileSpy.mockRestore();
    });

    it("should call getProfile when user has authenticated with Google", async () => {
      mockHasUserEverAuthenticated.mockReturnValue(true);
      const getProfileSpy = jest.spyOn(UserApi, "getProfile");
      mockUsePostHog.mockReturnValue({
        identify: mockIdentify,
      } as any);

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
      expect(getProfileSpy).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      getProfileSpy.mockRestore();
    });
  });
});
