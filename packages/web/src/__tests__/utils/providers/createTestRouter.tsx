import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { type ReactElement } from "react";

/**
 * A router whose root route renders `ui` regardless of the matched path. The
 * `$` splat child exists only so any `initialEntries` path matches instead of
 * falling through to `notFoundComponent`.
 */
export function createTestRouter(
  ui: ReactElement,
  opts?: { initialEntries?: string[] },
) {
  const rootRoute = createRootRoute({ component: () => ui });
  const catchAllRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "$",
  });

  return createRouter({
    routeTree: rootRoute.addChildren([catchAllRoute]),
    history: createMemoryHistory({
      initialEntries: opts?.initialEntries ?? ["/"],
    }),
    defaultPendingMs: 0,
  });
}
