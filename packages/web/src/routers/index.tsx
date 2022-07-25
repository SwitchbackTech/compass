import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { LoginView } from "@web/views/Login";
import { Calendar } from "@web/views/Calendar/Calendar";

export const CompassRoot = (
  <HashRouter>
    <div>
      <Routes>
        <Route path={ROOT_ROUTES.LOGIN} element={<LoginView />} />
        <Route path={ROOT_ROUTES.ROOT} element={<Calendar />} />
      </Routes>
    </div>
  </HashRouter>
);

export const RootRouter = () => CompassRoot;
