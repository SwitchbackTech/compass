import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { LoginView } from "@web/views/Login";
import { LogoutView } from "@web/views/Logout";
import { NotFoundView } from "@web/views/NotFound";
import { CalendarView } from "@web/views/Calendar";
import { ProtectedRoute } from "@web/auth/ProtectedRoute";
import SocketProvider from "@web/socket/SocketProvider";
import { UserProvider } from "@web/auth/UserContext";

const router = createBrowserRouter([
  {
    path: ROOT_ROUTES.ROOT,
    element: (
      <ProtectedRoute>
        <UserProvider>
          <SocketProvider>
            <CalendarView />
          </SocketProvider>
        </UserProvider>
      </ProtectedRoute>
    ),
  },
  { path: ROOT_ROUTES.LOGIN, element: <LoginView /> },
  { path: ROOT_ROUTES.LOGOUT, element: <LogoutView /> },
  { path: "*", element: <NotFoundView /> },
]);

export const RootRouter = () => {
  return <RouterProvider router={router} />;
};
