import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { LoginView } from "@web/views/Login";
import { Calendar } from "@web/views/Calendar/Calendar";
import { LogoutView } from "@web/views/Logout";
import { NotFoundView } from "@web/views/NotFound";

const router = createBrowserRouter([
  { path: ROOT_ROUTES.ROOT, element: <Calendar /> },
  { path: ROOT_ROUTES.LOGIN, element: <LoginView /> },
  { path: ROOT_ROUTES.LOGOUT, element: <LogoutView /> },
  { path: "*", element: <NotFoundView /> },
]);

export const RootRouter = () => {
  return <RouterProvider router={router} />;
};
