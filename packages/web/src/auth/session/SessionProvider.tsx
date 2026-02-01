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
import * as socket from "@web/socket/provider/SocketProvider";
import { CompassSession } from "./session.types";

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

export const SessionContext = createContext<CompassSession>({
  authenticated: false,
  loading: true,
  isSyncing: false,
  setAuthenticated: () => {},
  setLoading: () => {},
  setIsSyncing: () => {},
});

const authenticated$ = new BehaviorSubject(false);
const loading$ = new BehaviorSubject(false);
const syncing$ = new BehaviorSubject(false);

const $authenticated = authenticated$.pipe(skip(1), distinctUntilChanged());
const $loading = loading$.pipe(distinctUntilChanged());
const $syncing = syncing$.pipe(distinctUntilChanged());

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
        socket.reconnect();
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
  const [isSyncing, setIsSyncing] = useState(syncing$.value);

  useEffect(() => {
    const authSub = $authenticated.subscribe(setAuthenticated);
    const loadSub = $loading.subscribe(setLoading);
    const syncSub = $syncing.subscribe(setIsSyncing);

    return () => {
      authSub.unsubscribe();
      loadSub.unsubscribe();
      syncSub.unsubscribe();
    };
  }, []);

  // Expose test hooks for e2e testing
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__COMPASS_E2E_TEST__) {
      (window as any).__COMPASS_TEST_HOOKS__ = {
        setIsSyncing: (value: boolean) => syncing$.next(value),
        setAuthenticated: (value: boolean) => authenticated$.next(value),
        setLoading: (value: boolean) => loading$.next(value),
      };
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        authenticated,
        loading,
        isSyncing,
        setAuthenticated: (value: boolean) => authenticated$.next(value),
        setLoading: (value: boolean) => loading$.next(value),
        setIsSyncing: (value: boolean) => syncing$.next(value),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
