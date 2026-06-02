import {
  createBrowserRouter,
  type RouteObject,
  RouterProvider,
  type RouterProviderProps,
} from "react-router-dom";
import { IS_DEV } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import {
  loadAuthenticated,
  loadDayData,
  loadRootData,
  loadSpecificDayData,
} from "@web/routers/loaders";

const devOnlyRoutes: RouteObject[] = IS_DEV
  ? [
      {
        path: ROOT_ROUTES.CLEANUP,
        lazy: async () =>
          import(
            /* webpackChunkName: "cleanup" */ "@web/views/Cleanup/Cleanup"
          ).then((module) => ({
            Component: module.CleanupView,
          })),
      },
    ]
  : [];

export const router = createBrowserRouter(
  [
    {
      lazy: async () =>
        import(/* webpackChunkName: "calendar" */ "@web/views/Root").then(
          (module) => ({
            Component: module.RootView,
          }),
        ),
      loader: loadAuthenticated,
      children: [
        {
          path: ROOT_ROUTES.DAY,
          lazy: async () =>
            import(
              /* webpackChunkName: "day" */ "@web/views/Day/view/DayView"
            ).then((module) => ({ Component: module.DayView })),
          children: [
            {
              path: ROOT_ROUTES.DAY_DATE,
              id: ROOT_ROUTES.DAY_DATE,
              loader: loadSpecificDayData,
              lazy: async () =>
                import(
                  /* webpackChunkName: "date" */ "@web/views/Day/view/DayViewContent"
                ).then((module) => ({ Component: module.DayViewContent })),
            },
            {
              index: true,
              loader: loadDayData,
            },
          ],
        },
        {
          path: ROOT_ROUTES.WEEK,
          lazy: async () =>
            import(
              /* webpackChunkName: "week" */ "@web/views/Week/WeekView"
            ).then((module) => ({
              Component: module.WeekView,
            })),
        },
        {
          path: ROOT_ROUTES.ROOT,
          loader: loadRootData,
        },
      ],
    },
    ...devOnlyRoutes,
    {
      path: ROOT_ROUTES.GOOGLE_AUTH_CALLBACK,
      lazy: async () =>
        import(
          /* webpackChunkName: "google-auth-callback" */ "@web/views/GoogleAuthCallback"
        ).then((module) => ({
          Component: module.GoogleAuthCallbackView,
        })),
    },
    {
      path: "*",
      lazy: async () =>
        import(/* webpackChunkName: "not-found" */ "@web/views/NotFound").then(
          (module) => ({
            Component: module.NotFoundView,
          }),
        ),
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

export const CompassRouterProvider = (
  props?: Partial<Pick<RouterProviderProps, "router">>,
) => {
  return (
    <RouterProvider
      router={props?.router ?? router}
      future={{ v7_startTransition: true }}
      fallbackElement={<AbsoluteOverflowLoader />}
    />
  );
};
