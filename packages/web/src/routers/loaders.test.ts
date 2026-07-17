import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isRedirect,
} from "@tanstack/react-router";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadDateParam,
  loadTodayData,
  redirectToDefaultCalendar,
  redirectToToday,
  validateWeekDateParam,
} from "@web/routers/loaders";
import { describe, expect, it } from "bun:test";

function getRedirect(fn: () => unknown) {
  try {
    fn();
  } catch (err) {
    if (!isRedirect(err)) throw err;
    return err;
  }
  throw new Error("expected a redirect to be thrown");
}

// A route tree scoped to just the redirect-relevant shape (no lazy view
// components) - loading the real production routeTree here would preload
// every view's dynamic import as a side effect and pollute other test files
// running later in the same process.
function createTestRouter(initialEntries: string[]) {
  const rootRoute = createRootRoute();
  const dayRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROOT_ROUTES.DAY,
  });
  const dayIndexRoute = createRoute({
    getParentRoute: () => dayRoute,
    path: "/",
    beforeLoad: () => redirectToToday(ROOT_ROUTES.DAY_DATE),
  });
  const dayDateRoute = createRoute({
    getParentRoute: () => dayRoute,
    path: "$dateString",
  });
  const weekRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROOT_ROUTES.WEEK,
  });
  const weekIndexRoute = createRoute({
    getParentRoute: () => weekRoute,
    path: "/",
    // Bare /week renders the view (no redirect); useWeek derives the anchor.
    component: () => null,
  });
  const weekDateRoute = createRoute({
    getParentRoute: () => weekRoute,
    path: "$dateString",
  });
  const rootIndexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: redirectToDefaultCalendar,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      dayRoute.addChildren([dayIndexRoute, dayDateRoute]),
      weekRoute.addChildren([weekIndexRoute, weekDateRoute]),
      rootIndexRoute,
    ]),
    history: createMemoryHistory({ initialEntries }),
    defaultPendingMs: 0,
  });
}

describe("router redirects", () => {
  it("redirects / to the bare week route", async () => {
    const router = createTestRouter(["/"]);

    await router.load();

    expect(router.state.location.pathname).toBe(ROOT_ROUTES.WEEK);
  });

  it("preserves search params when redirecting / to the week route", async () => {
    const router = createTestRouter(["/?auth=login"]);

    await router.load();

    expect(router.state.location.pathname).toBe(ROOT_ROUTES.WEEK);
    expect(router.state.location.search).toEqual({ auth: "login" });
  });

  it("redirects /day to today's dated day route", async () => {
    const { dateString } = loadTodayData();
    const router = createTestRouter(["/day"]);

    await router.load();

    expect(router.state.location.pathname).toBe(`/day/${dateString}`);
  });

  it("preserves ?auth=login across the today redirect", async () => {
    const { dateString } = loadTodayData();
    const router = createTestRouter(["/day?auth=login"]);

    await router.load();

    expect(router.state.location.pathname).toBe(`/day/${dateString}`);
    expect(router.state.location.search).toEqual({ auth: "login" });
  });

  it("preserves an unrelated search param across the today redirect", async () => {
    const { dateString } = loadTodayData();
    const router = createTestRouter(["/day?ref=newsletter"]);

    await router.load();

    expect(router.state.location.pathname).toBe(`/day/${dateString}`);
    expect(router.state.location.search).toEqual({ ref: "newsletter" });
  });
});

describe("loadDateParam", () => {
  it("shapes the loader data for an already-valid dateString param", () => {
    const result = loadDateParam({
      params: { dateString: "2026-05-20" },
    });

    expect(result).toMatchObject({ dateString: "2026-05-20" });
  });

  // dayEventQueryRange formats dateInView to build the day's query bounds, so
  // a UTC-mode value would shift the window off local midnight and drop
  // evening events from the day view and Up Next card.
  it("returns local-mode midnight, not UTC", () => {
    const result = loadDateParam({
      params: { dateString: "2026-05-20" },
    });

    expect(result.dateInView.isUTC()).toBe(false);
    expect(result.dateInView.hour()).toBe(0);
  });
});

describe("validateWeekDateParam", () => {
  it("redirects to the bare week route for an invalid dateString param", () => {
    const redirect = getRedirect(() =>
      validateWeekDateParam({ params: { dateString: "not-a-date" } }),
    );

    expect(redirect.options.to).toBe(ROOT_ROUTES.WEEK);
  });
});
