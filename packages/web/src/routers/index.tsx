import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { UserProvider } from "@web/auth/UserProvider";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import { loadLoggedInData, loadLoginData } from "@web/routers/loaders";
import SocketProvider from "@web/socket/SocketProvider";

export const router = createBrowserRouter(
  [
    {
      element: (
        <UserProvider>
          <SocketProvider>
            <AuthenticatedLayout />
          </SocketProvider>
        </UserProvider>
      ),
      loader: loadLoggedInData,
      children: [
        {
          path: ROOT_ROUTES.NOW,
          lazy: async () =>
            import(/* webpackChunkName: "now" */ "@web/views/Now/NowView").then(
              (module) => ({
                Component: module.NowView,
              }),
            ),
        },
        {
          path: ROOT_ROUTES.DAY,
          lazy: async () =>
            import(
              /* webpackChunkName: "day" */ "@web/views/Day/view/DayView"
            ).then((module) => ({
              Component: module.DayView,
            })),
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
            import(/* webpackChunkName: "home" */ "@web/views/Root").then(
              (module) => ({
                Component: module.RootView,
              }),
            ),
        },
      ],
    },
    {
      path: "/onboarding",
      lazy: async () =>
        import(
          /* webpackChunkName: "onboarding" */ "@web/views/Onboarding/OnboardingFlow"
        ).then((module) => ({
          Component: module.OnboardingFlow,
        })),
    },
    {
      path: ROOT_ROUTES.LOGIN,
      loader: loadLoginData,
      lazy: async () =>
        import(
          /* webpackChunkName: "onboarding" */ "@web/views/Onboarding/OnboardingFlow"
        ).then((module) => ({
          Component: module.OnboardingFlow,
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

export const RootRouter = () => {
  return (
    <RouterProvider
      router={router}
      future={{ v7_startTransition: true }}
      fallbackElement={<AbsoluteOverflowLoader />}
    />
  );
};
