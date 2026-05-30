import {
  createContext,
  type PropsWithChildren,
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
} from "@web/auth/compass/state/auth.state.util";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import * as sse from "@web/sse/provider/SSEProvider";
import { store } from "@web/store";
import { clearGoogleSyncIndicatorOverride } from "../../google/state/google.sync.state";
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
let isSessionInitialized = false;
let sessionEventVersion = 0;

const $authenticated = authenticated$.pipe(skip(1), distinctUntilChanged());

const handleAuthenticatedSession = () => {
  authenticated$.next(true);
  markUserAsAuthenticated(getLastKnownEmail());
  void refreshUserMetadata();
};

const handleSessionExists = () => {
  handleAuthenticatedSession();
  if (!sse.getStream()) {
    sse.openStream();
  }
};

const handleSessionMissing = () => {
  authenticated$.next(false);
  store.dispatch(authSlice.actions.resetAuth());
  store.dispatch(userMetadataSlice.actions.clear(undefined));
  clearGoogleSyncIndicatorOverride();
};

async function checkIfSessionExists(): Promise<boolean> {
  // Skip real session check in e2e tests — tests control auth state via Redux dispatch.
  // Running SuperTokens session checks races against those dispatches and resets state.
  if (typeof window !== "undefined" && window.__COMPASS_E2E_TEST__) {
    return false;
  }

  if (isCheckingSession) return authenticated$.value;

  isCheckingSession = true;
  const eventVersionAtCheckStart = sessionEventVersion;

  try {
    const exists = await session.doesSessionExist();

    if (sessionEventVersion !== eventVersionAtCheckStart) {
      return authenticated$.value;
    }

    if (exists) {
      handleSessionExists();
    } else {
      handleSessionMissing();
    }

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
  if (isSessionInitialized) {
    return;
  }

  isSessionInitialized = true;
  void checkIfSessionExists();

  // No need to unsubscribe as this runs for the lifetime of the app
  session.events.pipe(distinctUntilKeyChanged("action")).subscribe((e) => {
    switch (e.action) {
      case "REFRESH_SESSION":
      case "SESSION_CREATED":
        sessionEventVersion += 1;
        // Mark user as authenticated when session is created or refreshed
        // This ensures the flag is set even if markUserAsAuthenticated wasn't called during OAuth
        handleAuthenticatedSession();
        sse.closeStream();
        sse.openStream();
        break;
      case "SIGN_OUT":
        sessionEventVersion += 1;
        handleSessionMissing();
        sse.closeStream();
        break;
      default:
        void checkIfSessionExists();
    }
  });
}

export function SessionProvider({ children }: PropsWithChildren<object>) {
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
