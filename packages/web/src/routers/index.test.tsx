import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  authenticatedLayoutRoute,
  calendarShellRoute,
  lifeRoute,
  publicBookRoute,
  rootRoute,
  routeTree,
} from "@web/routers/router.routes";
import { describe, expect, it } from "bun:test";

createRouter({ routeTree, history: createMemoryHistory() });

describe("routeTree", () => {
  it("registers /life under the calendar shell (not the public booking route)", () => {
    expect(lifeRoute.fullPath).toBe(ROOT_ROUTES.LIFE);
    expect(lifeRoute.options.loader).toBeUndefined();
    expect(lifeRoute.parentRoute).toBe(calendarShellRoute);
  });

  it("registers /book/$username as a public route outside the calendar shell", () => {
    expect(publicBookRoute.fullPath).toBe("/book/$username");
    expect(publicBookRoute.options.beforeLoad).toBeUndefined();
    expect(publicBookRoute.parentRoute).toBe(rootRoute);
  });

  it("gates the authenticated layout behind loadAuthenticated inside the calendar shell", () => {
    expect(authenticatedLayoutRoute.options.beforeLoad).toBeDefined();
    expect(authenticatedLayoutRoute.parentRoute).toBe(calendarShellRoute);
  });
});
