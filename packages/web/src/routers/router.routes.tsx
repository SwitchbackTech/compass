import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { IS_DEV } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadAuthenticated,
  loadDateParam,
  redirectToToday,
  validateDayDateParam,
  validateWeekDateParam,
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
  beforeLoad: loadAuthenticated,
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
  beforeLoad: validateDayDateParam,
  loader: loadDateParam,
  component: lazyRouteComponent(
    () => import("@web/views/Day/view/DayViewContent"),
    "DayViewContent",
  ),
});

export const dayIndexRoute = createRoute({
  getParentRoute: () => dayRoute,
  path: "/",
  beforeLoad: () => redirectToToday(ROOT_ROUTES.DAY_DATE),
});

export const weekRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: ROOT_ROUTES.WEEK,
});

export const weekDateRoute = createRoute({
  getParentRoute: () => weekRoute,
  path: "$dateString",
  beforeLoad: validateWeekDateParam,
  loader: loadDateParam,
  component: lazyRouteComponent(
    () => import("@web/views/Week/WeekView"),
    "WeekView",
  ),
});

export const weekIndexRoute = createRoute({
  getParentRoute: () => weekRoute,
  path: "/",
  beforeLoad: () => redirectToToday(ROOT_ROUTES.WEEK_DATE),
});

export const rootIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/",
  beforeLoad: () => redirectToToday(ROOT_ROUTES.DAY_DATE),
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
