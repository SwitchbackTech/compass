import {
  type PropsWithChildren,
  createContext,
  useEffect,
  useState,
} from "react";
import { BehaviorSubject } from "rxjs";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  skip,
} from "rxjs/operators";
import SuperTokens from "supertokens-web-js";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import EmailVerification from "supertokens-web-js/recipe/emailverification";
import Session from "supertokens-web-js/recipe/session";
import ThirdParty from "supertokens-web-js/recipe/thirdparty";
import { APP_NAME } from "@core/constants/core.constants";
import {
  getLastKnownEmail,
  markUserAsAuthenticated,
} from "@web/auth/state/auth.state.util";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import * as sse from "@web/sse/provider/SSEProvider";
import { store } from "@web/store";
import { refreshUserMetadata } from "../user/util/user-metadata.util";
import { type CompassSession } from "./session.types";

SuperTokens.init({
  appInfo: {
    appName: APP_NAME,
    apiDomain: ENV_WEB.API_BASEURL,
    apiBasePath: ROOT_ROUTES.API,
  },
  recipeList: [
    ThirdParty.init(),
    EmailPassword.init(),
    EmailVerification.init(),
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

const handleSessionExists = () => {
  markUserAsAuthenticated(getLastKnownEmail());
  void refreshUserMetadata();
};

const handleSessionMissing = () => {
  store.dispatch(authSlice.actions.resetAuth());
  store.dispatch(importGCalSlice.actions.clearImportResults(undefined));
  store.dispatch(userMetadataSlice.actions.clear(undefined));
};

async function checkIfSessionExists(): Promise<boolean> {
  // Skip real session check in e2e tests — tests control auth state via Redux dispatch.
  // Running SuperTokens session checks races against those dispatches and resets state.
  if (typeof window !== "undefined" && window.__COMPASS_E2E_TEST__) {
    return false;
  }

  if (isCheckingSession) return false;

  isCheckingSession = true;

  try {
    const exists = await session.doesSessionExist();

    if (exists) {
      handleSessionExists();
      if (!sse.getStream()) {
        sse.openStream();
      }
    } else {
      handleSessionMissing();
    }

    authenticated$.next(exists);
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
        markUserAsAuthenticated(getLastKnownEmail());
        void refreshUserMetadata();
        sse.closeStream();
        sse.openStream();
        break;
      case "SIGN_OUT":
        store.dispatch(userMetadataSlice.actions.clear(undefined));
        sse.closeStream();
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
    if (typeof window !== "undefined" && window.__COMPASS_E2E_TEST__) {
      window.__COMPASS_E2E_HOOKS__ = {
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
