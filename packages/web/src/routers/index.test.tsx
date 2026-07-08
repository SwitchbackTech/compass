import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  authenticatedLayoutRoute,
  lifeRoute,
  rootRoute,
  routeTree,
} from "@web/routers/router.routes";
import { describe, expect, it } from "bun:test";

// Constructing a router (without rendering it) resolves each route's
// path/parentRoute getters, which otherwise stay unpopulated until the tree
// is processed.
createRouter({ routeTree, history: createMemoryHistory() });

describe("routeTree", () => {
  it("registers /life as a public route (no loader) directly under the root", () => {
    expect(lifeRoute.fullPath).toBe(ROOT_ROUTES.LIFE);
    expect(lifeRoute.options.loader).toBeUndefined();
    expect(lifeRoute.parentRoute).toBe(rootRoute);
  });

  it("gates the authenticated layout behind loadAuthenticated", () => {
    expect(authenticatedLayoutRoute.options.beforeLoad).toBeDefined();
    expect(authenticatedLayoutRoute.parentRoute).toBe(rootRoute);
  });
});
