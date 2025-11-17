import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  skip,
} from "rxjs/operators";
import SuperTokens from "supertokens-web-js";
import Session from "supertokens-web-js/recipe/session";
import ThirdParty from "supertokens-web-js/recipe/thirdparty";
import { APP_NAME } from "@core/constants/core.constants";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import * as socket from "@web/socket/SocketProvider";

SuperTokens.init({
  appInfo: {
    appName: APP_NAME,
    apiDomain: ENV_WEB.API_BASEURL,
    apiBasePath: ROOT_ROUTES.API,
  },
  recipeList: [
    ThirdParty.init(),
    Session.init({
      postAPIHook: async (context) => {
        session.emit(context.action, context);
      },
      onHandleEvent: (event) => {
        session.emit(event.action, event);
      },
    }),
  ],
});

interface SessionContext {
  loading: boolean;
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}

export const SessionContext = createContext<SessionContext>({
  authenticated: false,
  loading: true,
  setAuthenticated: () => {},
  setLoading: () => {},
});

const authenticated$ = new BehaviorSubject(false);
const loading$ = new BehaviorSubject(false);

const $authenticated = authenticated$.pipe(skip(1), distinctUntilChanged());
const $loading = loading$.pipe(distinctUntilChanged());

async function checkIfSessionExists(): Promise<boolean> {
  try {
    if (loading$.value) return false;

    loading$.next(true);

    const exists = await session.doesSessionExist();
    const socketConnected = socket.socket.connected;

    authenticated$.next(exists);
    loading$.next(false);

    if (exists && !socketConnected) socket.socket.connect();

    return exists;
  } catch (error) {
    console.error("Error checking auth status:", error);
    authenticated$.next(false);
    loading$.next(false);

    return false;
  }
}

export function sessionInit() {
  checkIfSessionExists();

  // No need to unsubscribe as this runs for the lifetime of the app
  session.events.pipe(distinctUntilKeyChanged("action")).subscribe((e) => {
    checkIfSessionExists();

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
        setLoading: (value: boolean) => loading$.next(value),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
