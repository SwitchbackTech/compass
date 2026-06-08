import { ROOT_ROUTES } from "@web/common/constants/routes";
import { routeObjects } from "@web/routers/router.routes";
import { describe, expect, it } from "bun:test";

describe("routeObjects", () => {
  it("registers /life as a public route before authenticated app routes", () => {
    const lifeRoute = routeObjects.find((r) => r.path === ROOT_ROUTES.LIFE);
    const lifeRouteIndex = routeObjects.findIndex(
      (r) => r.path === ROOT_ROUTES.LIFE,
    );
    const authenticatedRoute = routeObjects.find((r) => r.loader !== undefined);
    const authenticatedRouteIndex = routeObjects.findIndex(
      (r) => r.loader !== undefined,
    );

    expect(lifeRoute).toBeDefined();
    expect(lifeRoute?.loader).toBeUndefined();
    expect(authenticatedRoute).toBeDefined();
    expect(authenticatedRoute?.loader).toBeDefined();
    expect(lifeRouteIndex).toBeLessThan(authenticatedRouteIndex);
  });
});
