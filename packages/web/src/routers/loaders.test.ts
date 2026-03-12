import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadAuthenticated,
  loadRootData,
  loadTodayData,
} from "@web/routers/loaders";
import { session } from "../common/classes/Session";

jest.mock("../common/classes/Session", () => ({
  session: {
    doesSessionExist: jest.fn(),
  },
}));

const mockedSession = session as { doesSessionExist: jest.Mock };

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
    mockedSession.doesSessionExist.mockResolvedValue(true);

    await expect(loadAuthenticated()).resolves.toEqual({ authenticated: true });
  });

  it("returns authenticated false when session check fails", async () => {
    mockedSession.doesSessionExist.mockRejectedValue(new Error("Failed to fetch"));

    await expect(loadAuthenticated()).resolves.toEqual({ authenticated: false });
  });
});
