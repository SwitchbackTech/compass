import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { afterAll } from "bun:test";
import { toast } from "react-toastify";
import { Status } from "@core/errors/status.codes";
import { setTestWindowUrl } from "@web/__tests__/set-test-window-url";
import { session } from "@web/common/classes/Session";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { type ApiError, type ApiResponse } from "../api.types";

// Mock definitions
const mockAssignLocation = mock();
const mockReloadLocation = mock();

mock.module("@web/common/utils/browser/browser-navigation.util", () => ({
  assignLocation: mockAssignLocation,
  reloadLocation: mockReloadLocation,
}));

// Mock supertokens session
const mockSignOut = mock();
const mockDoesSessionExist = mock();

mock.module("supertokens-web-js/recipe/session", () => ({
  default: {
    signOut: mockSignOut,
    doesSessionExist: mockDoesSessionExist,
  },
  signOut: mockSignOut,
  doesSessionExist: mockDoesSessionExist,
}));

// Import BaseApi AFTER mocks
const { BaseApi } = require("./base.api") as typeof import("./base.api");

const originalAdapter = BaseApi.defaults.adapter;

const setLocationPath = (pathname: string) => {
  setTestWindowUrl(pathname);
};

const createApiError = (
  status: number,
  url?: string,
  data?: unknown,
): ApiError => {
  const config = { method: "GET", url: url ?? "/test" };
  const response = {
    config,
    data: data ?? {},
    headers: new Headers(),
    status,
    statusText: "Error",
  } as ApiResponse<unknown>;

  const error = new Error("boom") as ApiError;
  error.config = config;
  error.name = "ApiError";
  error.response = response;
  return error;
};

const triggerErrorResponse = async (
  status: number,
  url?: string,
  data?: unknown,
) => {
  const apiError = createApiError(status, url, data);
  const adapter = () => Promise.reject(apiError);
  BaseApi.defaults.adapter = adapter;

  try {
    await BaseApi.get("/test");
  } catch (e) {
    // expected
  }
};

describe("CompassApi interceptor auth handling", () => {
  it("sends cookies with cross-origin API requests", () => {
    expect(BaseApi.defaults.withCredentials).toBe(true);
  });

  let toastIsActiveSpy: any;
  let toastErrorSpy: any;
  let alertSpy: any;
  let consoleErrorSpy: any;
  let sessionSignOutSpy: any;

  beforeEach(() => {
    mockAssignLocation.mockReset();
    mockReloadLocation.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockDoesSessionExist.mockResolvedValue(true);

    sessionSignOutSpy = spyOn(session, "signOut").mockResolvedValue(undefined);
    toastIsActiveSpy = spyOn(toast, "isActive").mockReturnValue(false);
    toastErrorSpy = spyOn(toast, "error").mockReturnValue("toast-id" as any);
    alertSpy = spyOn(globalThis, "alert").mockImplementation(() => undefined);
    consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => undefined,
    );

    setLocationPath(ROOT_ROUTES.NOW);
  });

  afterEach(() => {
    sessionSignOutSpy.mockRestore();
    toastIsActiveSpy.mockRestore();
    toastErrorSpy.mockRestore();
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    BaseApi.defaults.adapter = originalAdapter;
  });

  it("signs out and redirects to day when Google token is invalid", async () => {
    await triggerErrorResponse(Status.NOT_FOUND);

    expect(globalThis.alert).toHaveBeenCalledWith(
      "Login required, cuz security 😇",
    );
    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(mockAssignLocation).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("does not redirect if user is already on the day route", async () => {
    // Use setTestWindowUrl to change window.location.pathname via history API
    setLocationPath(ROOT_ROUTES.DAY);

    await triggerErrorResponse(Status.NOT_FOUND);

    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(mockAssignLocation).not.toHaveBeenCalled();
  });

  it("shows session-expired toast and signs out on unauthorized", async () => {
    await triggerErrorResponse(Status.UNAUTHORIZED);

    expect(toast.error).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        toastId: "session-expired-api",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }),
    );
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(mockAssignLocation).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("does not enqueue duplicate session-expired toasts when already active", async () => {
    toastIsActiveSpy.mockReturnValueOnce(false).mockReturnValue(true);

    await triggerErrorResponse(Status.UNAUTHORIZED);
    await triggerErrorResponse(Status.UNAUTHORIZED);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("reloads the page when redux refresh is needed", async () => {
    await triggerErrorResponse(Status.REDUX_REFRESH_NEEDED);

    expect(mockReloadLocation).toHaveBeenCalledTimes(1);
    expect(session.signOut).not.toHaveBeenCalled();
    expect(mockAssignLocation).not.toHaveBeenCalled();
  });

  it("logs other errors without forcing a logout", async () => {
    await triggerErrorResponse(Status.INTERNAL_SERVER);

    expect(console.error).toHaveBeenCalled();
    expect(session.signOut).not.toHaveBeenCalled();
    expect(mockAssignLocation).not.toHaveBeenCalled();
  });

  it("does not sign out or redirect on /user/profile 404", async () => {
    await triggerErrorResponse(Status.NOT_FOUND, "/user/profile");

    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(session.signOut).not.toHaveBeenCalled();
    expect(mockAssignLocation).not.toHaveBeenCalled();
  });

  it("does not sign out on 401/410 when response has GOOGLE_REVOKED code", async () => {
    const googleRevokedPayload = {
      code: "GOOGLE_REVOKED",
      message: "Google access revoked.",
    };
    const toastExpectation = expect.objectContaining({
      toastId: GOOGLE_REVOKED_TOAST_ID,
      autoClose: false,
    });

    for (const status of [Status.UNAUTHORIZED, Status.GONE]) {
      toastErrorSpy.mockClear();
      sessionSignOutSpy.mockClear();
      mockAssignLocation.mockClear();

      await triggerErrorResponse(status, undefined, googleRevokedPayload);

      expect(toast.error).toHaveBeenCalledWith(
        "Google access revoked. Your Google data has been removed.",
        toastExpectation,
      );
      expect(session.signOut).not.toHaveBeenCalled();
      expect(mockAssignLocation).not.toHaveBeenCalled();
    }
  });
});

afterAll(() => {
  mock.restore();
});
