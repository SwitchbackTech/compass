import { PropsWithChildren, createContext } from "react";
import { BehaviorSubject } from "rxjs";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  skip,
} from "rxjs/operators";
import { session } from "@web/common/classes/Session";
import * as socket from "@web/socket/SocketProvider";
import { ROOT_ROUTES } from "../common/constants/routes";
import { router } from "../routers";

interface SessionContext {
  loading: boolean;
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export const SessionContext = createContext<SessionContext>({
  authenticated: false,
  loading: true,
  setAuthenticated: () => {},
});

const authenticated$ = new BehaviorSubject(false);
const loading$ = new BehaviorSubject(false);

function checkAuth() {
  loading$.next(true);

  session
    .doesSessionExist()
    .then((exists) => authenticated$.next(exists))
    .finally(() => loading$.next(false));
}

export function sessionInit() {
  checkAuth();

  // No need to unsubscribe as this runs for the lifetime of the app
  session.events.pipe(distinctUntilKeyChanged("action")).subscribe((e) => {
    checkAuth();

    switch (e.action) {
      case "REFRESH_SESSION":
      case "SESSION_CREATED":
        socket.reconnect(e.action);
        break;
      case "SIGN_OUT":
        socket.onUserSignOut();
        break;
    }
  });

  authenticated$
    .pipe(skip(1), distinctUntilChanged())
    .subscribe((authenticated) => {
      router.navigate(authenticated ? ROOT_ROUTES.ROOT : ROOT_ROUTES.LOGIN, {
        replace: true,
      });
    });
}

export function SessionProvider({ children }: PropsWithChildren<{}>) {
  return (
    <SessionContext.Provider
      value={{
        authenticated: authenticated$.value,
        loading: loading$.value,
        setAuthenticated: authenticated$.next.bind(authenticated$),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
