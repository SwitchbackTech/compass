import { ROOT_ROUTES } from "@web/common/constants/routes";
import { session } from "@web/common/classes/Session";
import {
  loadAuthenticated,
  loadRootData,
  loadTodayData,
} from "@web/routers/loaders";

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns authenticated true when session exists", async () => {
    (session.doesSessionExist as jest.Mock).mockResolvedValue(true);

    await expect(loadAuthenticated()).resolves.toEqual({ authenticated: true });
  });

  it("returns authenticated false when session check fails", async () => {
    (session.doesSessionExist as jest.Mock).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    await expect(loadAuthenticated()).resolves.toEqual({ authenticated: false });
  });
});
