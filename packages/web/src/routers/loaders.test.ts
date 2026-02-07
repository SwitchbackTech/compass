import { ROOT_ROUTES } from "@web/common/constants/routes";
import { loadRootData } from "@web/routers/loaders";

describe("loadRootData", () => {
  it("redirects root route to day route", async () => {
    const response = await loadRootData();

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(ROOT_ROUTES.DAY);
  });
});
