import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { LoginView } from "@web/views/Login";
import { Calendar } from "@web/views/Calendar/Calendar";
import { LogoutView } from "@web/views/Logout";

const NotFound = () => {
  return <h2>not found</h2>;
};

export const CompassRoot = (
  <BrowserRouter>
    <Routes>
      <Route path={ROOT_ROUTES.ROOT} element={<Calendar />} />
      <Route path={ROOT_ROUTES.LOGIN} element={<LoginView />} />
      <Route path={ROOT_ROUTES.LOGOUT} element={<LogoutView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export const RootRouter = () => CompassRoot;
