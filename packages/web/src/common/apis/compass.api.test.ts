import { toast } from "react-toastify";
import { Status } from "@core/errors/status.codes";
import { setTestWindowUrl } from "@web/__tests__/set-test-window-url";
import { session } from "@web/common/classes/Session";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  assignLocation,
  reloadLocation,
} from "@web/common/utils/browser/browser-navigation.util";
import { type ApiError, type ApiResponse, CompassApi } from "./compass.api";

jest.mock("@web/common/utils/browser/browser-navigation.util", () => ({
  assignLocation: jest.fn(),
  reloadLocation: jest.fn(),
}));

jest.mock("supertokens-web-js/recipe/session", () => {
  const actual = jest.requireActual("supertokens-web-js/recipe/session");
  const mockedDefault = {
    ...actual.default,
    doesSessionExist: jest.fn(),
    signOut: jest.fn(),
  };

  return {
    __esModule: true,
    ...actual,
    default: mockedDefault,
    doesSessionExist: mockedDefault.doesSessionExist,
    signOut: mockedDefault.signOut,
  };
});

const assignMock = jest.mocked(assignLocation);
const reloadMock = jest.mocked(reloadLocation);
const originalAdapter = CompassApi.defaults.adapter;

const setLocationPath = (pathname: string) => {
  setTestWindowUrl(pathname);
};

const createApiError = (
  status: number,
  url?: string,
  data?: unknown,
): ApiError => {
  const config = { method: "GET", url };
  const response = {
    config,
    data: data ?? {},
    headers: new Headers(),
    status,
    statusText: "Error",
  } as ApiResponse<unknown>;

  return {
    config,
    message: "boom",
    name: "ApiError",
    response,
    toJSON: () => ({}),
  } as ApiError;
};

const triggerErrorResponse = async (
  status: number,
  url?: string,
  data?: unknown,
) => {
  const apiError = createApiError(status, url, data);
  const adapter = () => Promise.reject(apiError);
  CompassApi.defaults.adapter = adapter;

  await CompassApi.get("/test").catch(() => undefined);
};

describe("CompassApi interceptor auth handling", () => {
  it("sends cookies with cross-origin API requests", () => {
    expect(CompassApi.defaults.withCredentials).toBe(true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    assignMock.mockReset();
    reloadMock.mockReset();
    (session.signOut as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(toast, "isActive").mockReturnValue(false);
    jest.spyOn(toast, "error").mockReturnValue("toast-id" as never);
    setLocationPath(ROOT_ROUTES.NOW);
    jest.spyOn(globalThis, "alert").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    CompassApi.defaults.adapter = originalAdapter;
  });

  it("signs out and redirects to day when Google token is invalid", async () => {
    await triggerErrorResponse(Status.NOT_FOUND);

    expect(globalThis.alert).toHaveBeenCalledWith(
      "Login required, cuz security 😇",
    );
    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("does not redirect if user is already on the day route", async () => {
    setLocationPath(ROOT_ROUTES.DAY);

    await triggerErrorResponse(Status.NOT_FOUND);

    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).not.toHaveBeenCalled();
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
    expect(assignMock).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("does not enqueue duplicate session-expired toasts when already active", async () => {
    jest
      .spyOn(toast, "isActive")
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    await triggerErrorResponse(Status.UNAUTHORIZED);
    await triggerErrorResponse(Status.UNAUTHORIZED);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("reloads the page when redux refresh is needed", async () => {
    await triggerErrorResponse(Status.REDUX_REFRESH_NEEDED);

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(session.signOut).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("logs other errors without forcing a logout", async () => {
    await triggerErrorResponse(Status.INTERNAL_SERVER);

    expect(console.error).toHaveBeenCalled();
    expect(session.signOut).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("does not sign out or redirect on /user/profile 404", async () => {
    await triggerErrorResponse(Status.NOT_FOUND, "/user/profile");

    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(session.signOut).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
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
      jest.clearAllMocks();
      await triggerErrorResponse(status, undefined, googleRevokedPayload);

      expect(toast.error).toHaveBeenCalledWith(
        "Google access revoked. Your Google data has been removed.",
        toastExpectation,
      );
      expect(session.signOut).not.toHaveBeenCalled();
      expect(assignMock).not.toHaveBeenCalled();
    }
  });
});
