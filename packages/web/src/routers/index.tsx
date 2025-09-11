import React from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@web/auth/ProtectedRoute";
import { UserProvider } from "@web/auth/UserContext";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import SocketProvider from "@web/socket/SocketProvider";
import { LoginView } from "@web/views/Login";
import { LogoutView } from "@web/views/Logout";
import { NotFoundView } from "@web/views/NotFound";
import OnboardingFlow from "@web/views/Onboarding/OnboardingFlow";
import { RootView } from "@web/views/Root";

const router = createBrowserRouter([
  {
    path: ROOT_ROUTES.ROOT,
    // element: (
    // <ProtectedRoute>
    // <UserProvider>
    // <SocketProvider>
    // <RootView />
    // </SocketProvider>
    // </UserProvider>
    // </ProtectedRoute>
    // ),
    element: <OnboardingFlow />,
  },
  {
    path: ROOT_ROUTES.LOGIN,
    element: <OnboardingFlow />,
  },
  { path: ROOT_ROUTES.LOGOUT, element: <LogoutView /> },
  { path: "*", element: <NotFoundView /> },
]);

export const RootRouter = () => {
  return <RouterProvider router={router} />;
};
