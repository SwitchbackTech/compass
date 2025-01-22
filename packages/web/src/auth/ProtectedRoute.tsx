import React, { ReactNode, useLayoutEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { AuthApi } from "@web/common/apis/auth.api";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    async function ensureAuthentication() {
      const isSessionValid = await Session.doesSessionExist();
      const isGAccessTokenValid = await AuthApi.validateGoogleAccessToken();

      const isAuthenticated = isSessionValid && isGAccessTokenValid;
      setIsAuthenticated(isAuthenticated);
      if (!isAuthenticated) {
        const dueToGAuth = !!isSessionValid && !isGAccessTokenValid;

        if (dueToGAuth) {
          navigate(
            `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.GAUTH_SESSION_EXPIRED}`
          );
        } else {
          navigate(ROOT_ROUTES.LOGIN);
        }
      }
    }

    void ensureAuthentication();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <AbsoluteOverflowLoader />;
  } else {
    return <>{children}</>;
  }
};
