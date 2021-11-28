import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import { ROOT_ROUTES } from '@common/constants/routes';
import { CalendarView } from '@views/Calendar';
import { LoginView } from '@views/Login';

export const RootRouter = () => (
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
