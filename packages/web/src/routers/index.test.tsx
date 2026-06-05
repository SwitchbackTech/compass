import { ROOT_ROUTES } from "@web/common/constants/routes";
import { routeObjects } from "@web/routers/router.routes";
import { describe, expect, it } from "bun:test";

describe("routeObjects", () => {
  it("registers /life as a public route before authenticated app routes", () => {
    const [lifeRoute, authenticatedRoute] = routeObjects;

    expect(lifeRoute.path).toBe(ROOT_ROUTES.LIFE);
    expect(lifeRoute.loader).toBeUndefined();
    expect(authenticatedRoute.loader).toBeDefined();
  });
});
