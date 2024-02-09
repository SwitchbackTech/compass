import React, { ReactNode, useEffect } from "react";
import Session from "supertokens-auth-react/recipe/session";
import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { LoginView } from "@web/views/Login";
import { LogoutView } from "@web/views/Logout";
import { NotFoundView } from "@web/views/NotFound";
import { CalendarView } from "@web/views/Calendar";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSession() {
      const isAuthenticated = await Session.doesSessionExist();
      if (!isAuthenticated) {
        navigate(ROOT_ROUTES.LOGIN);
      }
    }

    void fetchSession();
  }, [navigate]);

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: ROOT_ROUTES.ROOT,
    element: (
      <ProtectedRoute>
        <CalendarView />
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
