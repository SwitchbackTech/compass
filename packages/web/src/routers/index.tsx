import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@web/auth/ProtectedRoute";
import { UserProvider } from "@web/auth/UserProvider";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AuthenticatedLayout } from "@web/components/AuthenticatedLayout/AuthenticatedLayout";
import SocketProvider from "@web/socket/SocketProvider";
import { DayView } from "@web/views/Day/view/DayView";
import { LogoutView } from "@web/views/Logout";
import { NotFoundView } from "@web/views/NotFound";
import { NowView } from "@web/views/Now/NowView";
import OnboardingFlow from "@web/views/Onboarding/OnboardingFlow";
import { RootView } from "@web/views/Root";

const router = createBrowserRouter(
  [
    {
      element: (
        <ProtectedRoute>
          <UserProvider>
            <SocketProvider>
              <AuthenticatedLayout />
            </SocketProvider>
          </UserProvider>
        </ProtectedRoute>
      ),
      children: [
        {
          path: ROOT_ROUTES.NOW,
          element: <NowView />,
        },
        {
          path: ROOT_ROUTES.ROOT,
          element: <RootView />,
        },
        {
          path: ROOT_ROUTES.DAY,
          element: <DayView />,
        },
      ],
    },
    {
      path: ROOT_ROUTES.LOGIN,
      element: <OnboardingFlow />,
    },
    { path: ROOT_ROUTES.LOGOUT, element: <LogoutView /> },
    { path: "*", element: <NotFoundView /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

export const RootRouter = () => {
  return <RouterProvider router={router} />;
};
