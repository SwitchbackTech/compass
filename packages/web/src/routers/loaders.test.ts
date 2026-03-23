import { Status } from "@core/errors/status.codes";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadAuthenticated,
  loadRootData,
  loadTodayData,
} from "@web/routers/loaders";
import { session } from "@web/common/classes/Session";

jest.mock("@web/common/classes/Session");

describe("loadRootData", () => {
  it("redirects root route to day route with today's date", async () => {
    const { dateString } = loadTodayData();
    const response = await loadRootData();

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.DAY}/${dateString}`,
    );
  });
});

describe("loadAuthenticated", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("returns authenticated false when session check returns unauthorized", async () => {
    (session.doesSessionExist as jest.Mock).mockRejectedValue({
      response: {
        status: Status.UNAUTHORIZED,
      },
    } as never);

    await expect(loadAuthenticated()).resolves.toEqual({ authenticated: false });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns authenticated false and logs unexpected errors", async () => {
    (session.doesSessionExist as jest.Mock).mockRejectedValue(
      new Error("session unavailable"),
    );

    await expect(loadAuthenticated()).resolves.toEqual({ authenticated: false });
    expect(console.error).toHaveBeenCalledWith(
      "Error checking auth status in route loader:",
      expect.any(Error),
    );
  });
});
