import React, { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";

import { useAuthCheck } from "./useAuthCheck";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const { isAuthenticated, isCheckingAuth, isGAccessTokenActive } =
    useAuthCheck();

  useEffect(() => {
    const handleAuthCheck = () => {
      if (!isAuthenticated) {
        if (!isGAccessTokenActive) {
          navigate(
            `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.GAUTH_SESSION_EXPIRED}`
          );
        } else {
          navigate(
            `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`
          );
        }
      }
    };

    void handleAuthCheck();
  }, [isAuthenticated, isGAccessTokenActive, navigate]);

  return (
    <>
      {isCheckingAuth && <AbsoluteOverflowLoader />}
      {children}
    </>
  );
};
