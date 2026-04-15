import { rest } from "msw";
import { isValidElement, type ReactElement } from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { renderHook, waitFor } from "@testing-library/react";
import { Status } from "@core/errors/status.codes";
// eslint-disable-next-line jest/no-mocks-import
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import * as authStateUtil from "@web/auth/compass/state/auth.state.util";
import { UserApi } from "@web/common/apis/user.api";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";
import { useLoadProfile } from "./useLoadProfile";

jest.mock("@web/auth/compass/state/auth.state.util", () => {
  const actual = jest.requireActual<typeof authStateUtil>(
    "@web/auth/compass/state/auth.state.util",
  );
  return {
    ...actual,
    getLastKnownEmail: jest.fn(),
  };
});
const mockGetLastKnownEmail = jest.mocked(authStateUtil.getLastKnownEmail);

const mockToastError = jest.mocked(toast.error);

describe("useLoadProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastKnownEmail.mockReturnValue("last-known@example.com");
  });

  it("does not call getProfile when user has never authenticated", async () => {
    const getProfileSpy = jest.spyOn(UserApi, "getProfile");

    renderHook(() => useLoadProfile(false));

    await waitFor(() => {
      expect(getProfileSpy).not.toHaveBeenCalled();
    });

    getProfileSpy.mockRestore();
  });

  it("calls getProfile when hasAuthenticatedBefore is true", async () => {
    const getProfileSpy = jest.spyOn(UserApi, "getProfile");

    renderHook(() => useLoadProfile(true));

    await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
    expect(getProfileSpy).toHaveBeenCalledTimes(1);

    getProfileSpy.mockRestore();
  });

  it("fetches the profile when hasAuthenticatedBefore becomes true after mount", async () => {
    const getProfileSpy = jest.spyOn(UserApi, "getProfile");

    const { result, rerender } = renderHook(
      ({ hasAuthenticatedBefore }: { hasAuthenticatedBefore: boolean }) =>
        useLoadProfile(hasAuthenticatedBefore),
      { initialProps: { hasAuthenticatedBefore: false } },
    );

    await waitFor(() => {
      expect(result.current.email).toBeNull();
    });
    expect(getProfileSpy).not.toHaveBeenCalled();

    rerender({ hasAuthenticatedBefore: true });

    await waitFor(() => expect(getProfileSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(result.current.email).toBe("test@example.com");
    });

    getProfileSpy.mockRestore();
  });

  it("shows the last known email while the profile is loading", async () => {
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
        return res(
          ctx.delay(100),
          ctx.status(Status.OK),
          ctx.json({
            userId: "test-user-123",
            email: "test@example.com",
          }),
        );
      }),
    );

    const { result } = renderHook(() => useLoadProfile(true));

    expect(result.current.email).toBe("last-known@example.com");

    await waitFor(() => {
      expect(result.current.email).toBe("test@example.com");
    });
  });

  it("returns profile without email when the API omits email", async () => {
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
        return res(
          ctx.status(Status.OK),
          ctx.json({ userId: "test-user-123" }),
        );
      }),
    );

    const { result } = renderHook(() => useLoadProfile(true));

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });
    expect(result.current.profileEmail).toBeNull();
    expect(result.current.userId).toBe("test-user-123");
  });

  it("returns profile without userId when the API omits userId", async () => {
    const getProfileSpy = jest.spyOn(UserApi, "getProfile");
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
        return res(
          ctx.status(Status.OK),
          ctx.json({ email: "test@example.com" }),
        );
      }),
    );

    const { result } = renderHook(() => useLoadProfile(true));

    await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
    await getProfileSpy.mock.results[0].value;

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });
    expect(result.current.userId).toBeNull();
    expect(result.current.profileEmail).toBe("test@example.com");

    getProfileSpy.mockRestore();
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

    renderHook(() => useLoadProfile(true));

    await waitFor(() => expect(getProfileSpy).toHaveBeenCalled());
    try {
      await getProfileSpy.mock.results[0].value;
    } catch {
      // expected — profile fetch rejects on 401
    }

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
    const toastElement = toastContent as ReactElement<{ toastId: string }>;
    expect(toastElement.type).toBe(SessionExpiredToast);
    expect(toastElement.props.toastId).toBe("session-expired-api");

    getProfileSpy.mockRestore();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
    });
  });
});
