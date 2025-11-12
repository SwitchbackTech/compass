import type {
  AxiosAdapter,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { signOut } from "supertokens-auth-react/recipe/session";
import { Status } from "@core/errors/status.codes";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { CompassApi } from "./compass.api";

jest.mock("supertokens-auth-react/recipe/session", () => ({
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

const createAxiosError = (status: number): AxiosError => {
  const response = {
    config: {} as InternalAxiosRequestConfig,
    data: {},
    headers: {},
    status,
    statusText: "Error",
  } as AxiosResponse;

  return {
    config: {} as InternalAxiosRequestConfig,
    isAxiosError: true,
    message: "boom",
    name: "AxiosError",
    response,
    toJSON: () => ({}),
  } as AxiosError;
};

const triggerErrorResponse = async (status: number) => {
  const axiosError = createAxiosError(status);
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
    setLocationPath(ROOT_ROUTES.NOW);
    jest.spyOn(window, "alert").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    CompassApi.defaults.adapter = originalAdapter;
  });

  it("signs out and redirects to login with GAUTH reason when Google token is invalid", async () => {
    await triggerErrorResponse(Status.NOT_FOUND);

    expect(window.alert).toHaveBeenCalledWith(
      "Login required, cuz security 😇",
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith(
      `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.GAUTH_SESSION_EXPIRED}`,
    );
  });

  it("does not redirect if user is already on the login route", async () => {
    setLocationPath(ROOT_ROUTES.LOGIN);

    await triggerErrorResponse(Status.NOT_FOUND);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(assignMock).not.toHaveBeenCalled();
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
});
