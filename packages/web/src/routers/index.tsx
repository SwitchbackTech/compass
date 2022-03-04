import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { CalendarView } from "@web/views/Calendar";
import { LoginView } from "@web/views/Login";

export const CompassRoot = (
  <HashRouter>
    <div>
      <Switch>
        <Route path={ROOT_ROUTES.LOGIN}>
          <LoginView />
        </Route>
        <Route path={ROOT_ROUTES.ROOT}>
          <CalendarView />
        </Route>
      </Switch>
    </div>
  </HashRouter>
);

export const RootRouter = () => CompassRoot;
