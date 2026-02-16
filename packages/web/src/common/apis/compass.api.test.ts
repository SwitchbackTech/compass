import type {
  AxiosAdapter,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "react-toastify";
import { signOut } from "supertokens-web-js/recipe/session";
import { Status } from "@core/errors/status.codes";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { CompassApi } from "./compass.api";

jest.mock("supertokens-web-js/recipe/session", () => ({
  signOut: jest.fn(),
}));

const assignMock = jest.fn();
const reloadMock = jest.fn();
const originalAdapter = CompassApi.defaults.adapter;

const setLocationPath = (pathname: string) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      assign: assignMock,
      reload: reloadMock,
      pathname,
    } as unknown as Location,
  });
};

const createAxiosError = (status: number, url?: string): AxiosError => {
  const config = { url } as InternalAxiosRequestConfig;
  const response = {
    config,
    data: {},
    headers: {},
    status,
    statusText: "Error",
  } as AxiosResponse;

  return {
    config,
    isAxiosError: true,
    message: "boom",
    name: "AxiosError",
    response,
    toJSON: () => ({}),
  } as AxiosError;
};

const triggerErrorResponse = async (status: number, url?: string) => {
  const axiosError = createAxiosError(status, url);
  const adapter: AxiosAdapter = () => Promise.reject(axiosError);
  CompassApi.defaults.adapter = adapter;

  await CompassApi.get("/test").catch(() => undefined);
};

describe("CompassApi interceptor auth handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assignMock.mockReset();
    reloadMock.mockReset();
    (signOut as jest.Mock).mockResolvedValue(undefined);
    (toast.isActive as jest.Mock).mockReturnValue(false);
    setLocationPath(ROOT_ROUTES.NOW);
    jest.spyOn(window, "alert").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    CompassApi.defaults.adapter = originalAdapter;
  });

  it("signs out and redirects to day when Google token is invalid", async () => {
    await triggerErrorResponse(Status.NOT_FOUND);

    expect(window.alert).toHaveBeenCalledWith(
      "Login required, cuz security 😇",
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("does not redirect if user is already on the day route", async () => {
    setLocationPath(ROOT_ROUTES.DAY);

    await triggerErrorResponse(Status.NOT_FOUND);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("shows session-expired toast and signs out on unauthorized", async () => {
    await triggerErrorResponse(Status.UNAUTHORIZED);

    expect(toast.error).toHaveBeenCalledWith(
      "Session expired. Please log in again to reconnect Google Calendar.",
      expect.objectContaining({
        toastId: "session-expired-api",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }),
    );
    expect(window.alert).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("does not enqueue duplicate session-expired toasts when already active", async () => {
    (toast.isActive as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    await triggerErrorResponse(Status.UNAUTHORIZED);
    await triggerErrorResponse(Status.UNAUTHORIZED);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("reloads the page when redux refresh is needed", async () => {
    await triggerErrorResponse(Status.REDUX_REFRESH_NEEDED);

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("logs other errors without forcing a logout", async () => {
    await triggerErrorResponse(Status.INTERNAL_SERVER);

    expect(console.error).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("does not sign out or redirect on /user/profile 404", async () => {
    await triggerErrorResponse(Status.NOT_FOUND, "/user/profile");

    expect(window.alert).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
