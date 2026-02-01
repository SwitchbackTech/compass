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
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
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
  setAuthenticated: () => {},
});

const authenticated$ = new BehaviorSubject(false);
let isCheckingSession = false;

const $authenticated = authenticated$.pipe(skip(1), distinctUntilChanged());

async function checkIfSessionExists(): Promise<boolean> {
  try {
    if (isCheckingSession) return false;
    isCheckingSession = true;

    const exists = await session.doesSessionExist();
    const socketConnected = socket.socket.connected;

    // If a session exists, mark the user as authenticated.
    // This ensures existing users who authenticated before the flag was introduced
    // will be properly marked, and the flag persists even if their session expires later.
    if (exists) {
      markUserAsAuthenticated();
    }

    authenticated$.next(exists);

    if (exists && !socketConnected) socket.socket.connect();

    return exists;
  } catch (error) {
    console.error("Error checking auth status:", error);
    authenticated$.next(false);

    return false;
  } finally {
    isCheckingSession = false;
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
        // Mark user as authenticated when session is created or refreshed
        // This ensures the flag is set even if markUserAsAuthenticated wasn't called during OAuth
        markUserAsAuthenticated();
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

  useEffect(() => {
    const authSub = $authenticated.subscribe(setAuthenticated);

    return () => {
      authSub.unsubscribe();
    };
  }, []);

  // Expose test hooks for e2e testing
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__COMPASS_E2E_TEST__) {
      (window as any).__COMPASS_TEST_HOOKS__ = {
        setAuthenticated: (value: boolean) => authenticated$.next(value),
      };
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        authenticated,
        setAuthenticated: (value: boolean) => authenticated$.next(value),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
