import {
  RouterProvider,
  RouterProviderProps,
  createBrowserRouter,
} from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import {
  loadDayData,
  loadOnboardingStatus,
  loadSpecificDayData,
} from "@web/routers/loaders";

export const router = createBrowserRouter(
  [
    {
      lazy: async () =>
        import(/* webpackChunkName: "calendar" */ "@web/views/Root").then(
          (module) => ({
            Component: module.RootView,
          }),
        ),
      loader: loadOnboardingStatus,
      children: [
        {
          path: ROOT_ROUTES.NOW,
          lazy: async () =>
            import(
              /* webpackChunkName: "now" */ "@web/views/Now/view/NowView"
            ).then((module) => ({
              Component: module.NowView,
            })),
        },
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
          path: ROOT_ROUTES.LOGOUT,
          lazy: async () =>
            import(/* webpackChunkName: "logout" */ "@web/views/Logout").then(
              (module) => ({
                Component: module.LogoutView,
              }),
            ),
        },
        {
          path: ROOT_ROUTES.ROOT,
          lazy: async () =>
            import(/* webpackChunkName: "home" */ "@web/views/Calendar").then(
              (module) => ({
                Component: module.CalendarView,
              }),
            ),
        },
      ],
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
