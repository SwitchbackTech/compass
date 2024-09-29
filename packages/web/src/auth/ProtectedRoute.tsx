import React, { ReactNode, useLayoutEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    async function fetchSession() {
      const isAuthenticated = await Session.doesSessionExist();
      setIsAuthenticated(isAuthenticated);
      if (!isAuthenticated) {
        navigate(ROOT_ROUTES.LOGIN);
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
