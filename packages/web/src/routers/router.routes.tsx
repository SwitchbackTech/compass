import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { IS_DEV } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadAuthenticated,
  loadDayData,
  loadRootData,
  loadSpecificDayData,
  loadSpecificWeekData,
  loadWeekData,
} from "@web/routers/loaders";
import { NotFoundView } from "@web/views/NotFound";

export const rootRoute = createRootRoute({
  notFoundComponent: NotFoundView,
});

export const lifeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROOT_ROUTES.LIFE,
  component: lazyRouteComponent(
    () => import("@web/views/Life/LifeView"),
    "LifeView",
  ),
});

export const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  loader: loadAuthenticated,
  component: lazyRouteComponent(() => import("@web/views/Root"), "RootView"),
});

export const dayRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: ROOT_ROUTES.DAY,
  component: lazyRouteComponent(
    () => import("@web/views/Day/view/DayView"),
    "DayView",
  ),
});

export const dayDateRoute = createRoute({
  getParentRoute: () => dayRoute,
  path: "$dateString",
  loader: loadSpecificDayData,
  component: lazyRouteComponent(
    () => import("@web/views/Day/view/DayViewContent"),
    "DayViewContent",
  ),
});

export const dayIndexRoute = createRoute({
  getParentRoute: () => dayRoute,
  path: "/",
  beforeLoad: loadDayData,
});

export const weekRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: ROOT_ROUTES.WEEK,
});

export const weekDateRoute = createRoute({
  getParentRoute: () => weekRoute,
  path: "$dateString",
  loader: loadSpecificWeekData,
  component: lazyRouteComponent(
    () => import("@web/views/Week/WeekView"),
    "WeekView",
  ),
});

export const weekIndexRoute = createRoute({
  getParentRoute: () => weekRoute,
  path: "/",
  beforeLoad: loadWeekData,
});

export const rootIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/",
  beforeLoad: loadRootData,
});

export const cleanupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROOT_ROUTES.CLEANUP,
  component: lazyRouteComponent(
    () => import("@web/views/Cleanup/Cleanup"),
    "CleanupView",
  ),
});

export const googleAuthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROOT_ROUTES.GOOGLE_AUTH_CALLBACK,
  component: lazyRouteComponent(
    () => import("@web/views/GoogleAuthCallback"),
    "GoogleAuthCallbackView",
  ),
});

const authenticatedRoute = authenticatedLayoutRoute.addChildren([
  dayRoute.addChildren([dayDateRoute, dayIndexRoute]),
  weekRoute.addChildren([weekDateRoute, weekIndexRoute]),
  rootIndexRoute,
]);

export const routeTree = rootRoute.addChildren([
  lifeRoute,
  authenticatedRoute,
  ...(IS_DEV ? [cleanupRoute] : []),
  googleAuthCallbackRoute,
]);
