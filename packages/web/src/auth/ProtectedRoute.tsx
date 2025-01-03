import React, { ReactNode, useLayoutEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { GoogleOAuthSession } from "@web/auth/gauth.util";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    async function fetchSession() {
      const isSessionValid = await Session.doesSessionExist();
      const isGAuthSessionValid = await GoogleOAuthSession.verifySession();

      const isAuthenticated = isSessionValid && isGAuthSessionValid;
      setIsAuthenticated(isAuthenticated);
      if (!isAuthenticated) {
        // Are we not authenticated because of a Google Auth session expiration?
        const dueToGAuth = !!isSessionValid && !isGAuthSessionValid;

        if (dueToGAuth) {
          navigate(`${ROOT_ROUTES.LOGIN}?reason=gauth-session-expired`);
        } else {
          navigate(ROOT_ROUTES.LOGIN);
        }
      }
    }

    void fetchSession();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <AbsoluteOverflowLoader />;
  } else {
    return <>{children}</>;
  }
};
