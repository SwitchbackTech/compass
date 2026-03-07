import { rest } from "msw";
import { type PostHog } from "posthog-js";
import { usePostHog } from "posthog-js/react";
import { act, isValidElement } from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Status } from "@core/errors/status.codes";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { UserProvider } from "@web/auth/context/UserProvider";
import * as authStateUtil from "@web/auth/state/auth.state.util";
import { UserApi } from "@web/common/apis/user.api";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";

jest.mock("posthog-js/react");
const mockUsePostHog = jest.mocked(usePostHog);
const mockToastError = jest.mocked(toast.error);

jest.mock("@web/auth/state/auth.state.util", () => {
  const actual = jest.requireActual<typeof authStateUtil>(
    "@web/auth/state/auth.state.util",
  );
  return {
    ...actual,
    hasUserEverAuthenticated: jest.fn(),
  };
});
const mockHasUserEverAuthenticated = jest.mocked(
  authStateUtil.hasUserEverAuthenticated,
);

// Mock AbsoluteOverflowLoader
jest.mock("@web/components/AbsoluteOverflowLoader", () => ({
  AbsoluteOverflowLoader: () => <div>Loading...</div>,
}));

const mockIdentify = jest.fn();

function mockPostHogEnabled(overrides?: Partial<PostHog>): void {
  mockUsePostHog.mockReturnValue({
    identify: mockIdentify,
    ...overrides,
  } as unknown as PostHog);
}

function mockPostHogDisabled(): void {
  mockUsePostHog.mockReturnValue(undefined as unknown as PostHog);
}

describe("UserProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockPostHogEnabled();
  });

  describe("PostHog Integration", () => {
    it("should call posthog.identify when PostHog is enabled and user data is available", async () => {
      const testUserId = "test-user-123";
      const testEmail = "test@example.com";

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

      expect(mockIdentify).toHaveBeenCalledWith(testEmail, {
        email: testEmail,
        userId: testUserId,
      });

      expect(mockIdentify).toHaveBeenCalledTimes(1);
    });

    it("should NOT call posthog.identify when PostHog is disabled", async () => {
      mockPostHogDisabled();

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

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

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Child")).toBeInTheDocument();
      });

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
      mockPostHogEnabled({
        identify: null as unknown as PostHog["identify"],
      });

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

      render(
        <UserProvider>
          <div>Test Child Content</div>
        </UserProvider>,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Test Child Content")).toBeInTheDocument();
      });
    });

    it("shows a login toast when profile fetch returns unauthorized", async () => {
      const assignMock = jest.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, assign: assignMock },
        configurable: true,
      });

      const getProfileSpy = jest.spyOn(UserApi, "getProfile");
      server.use(
        rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
          return res(ctx.status(Status.UNAUTHORIZED));
        }),
      );

      render(
        <UserProvider>
          <div>Test Child</div>
        </UserProvider>,
      );

      await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
      await act(async () => {
        try {
          await getProfileSpy.mock.results[0].value;
        } catch {
          // expected — profile fetch rejects on 401
        }
      });

      expect(mockToastError).toHaveBeenCalled();
      const latestToastCall =
        mockToastError.mock.calls[mockToastError.mock.calls.length - 1];
      expect(latestToastCall[1]).toEqual(
        expect.objectContaining({
          toastId: "session-expired-api",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
        }),
      );

      const toastContent = latestToastCall[0];
      expect(isValidElement(toastContent)).toBe(true);
      if (isValidElement<{ toastId: string }>(toastContent)) {
        expect(toastContent.type).toBe(SessionExpiredToast);
        expect(toastContent.props.toastId).toBe("session-expired-api");
      }

      expect(mockIdentify).not.toHaveBeenCalled();

      getProfileSpy.mockRestore();
      Object.defineProperty(window, "location", {
        value: originalLocation,
        configurable: true,
      });
    });
  });

  describe("Authentication Gating", () => {
    it("should NOT call getProfile when user has never authenticated", async () => {
      mockHasUserEverAuthenticated.mockReturnValue(false);
      const getProfileSpy = jest.spyOn(UserApi, "getProfile");

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
