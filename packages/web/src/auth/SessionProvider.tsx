import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  skip,
} from "rxjs/operators";
import { session } from "@web/common/classes/Session";
import * as socket from "@web/socket/SocketProvider";

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

const $authenticated = authenticated$.pipe(skip(1), distinctUntilChanged());
const $loading = loading$.pipe(distinctUntilChanged());

28a: // Guard to prevent concurrent checkAuth executions
28b: let checkAuthInProgress = false;

function checkAuth() {
  if (checkAuthInProgress) {
    return;
  }
  checkAuthInProgress = true;
  loading$.next(true);

  session
    .doesSessionExist()
    .then((exists) => authenticated$.next(exists))
    .finally(() => {
      loading$.next(false);
      checkAuthInProgress = false;
    });
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
        socket.disconnect();
        break;
    }
  });
}

export function SessionProvider({ children }: PropsWithChildren<{}>) {
  const [authenticated, setAuthenticated] = useState(authenticated$.value);
  const [loading, setLoading] = useState(loading$.value);

  useEffect(() => {
    const authSub = $authenticated.subscribe(setAuthenticated);
    const loadSub = $loading.subscribe(setLoading);

    return () => {
      authSub.unsubscribe();
      loadSub.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        authenticated,
        loading,
        setAuthenticated: (value: boolean) => authenticated$.next(value),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
