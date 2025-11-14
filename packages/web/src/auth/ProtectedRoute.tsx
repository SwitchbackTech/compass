import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { useAuthCheck } from "./useAuthCheck";
import { useHasCompletedSignup } from "./useHasCompletedSignup";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const { isAuthenticated, isCheckingAuth, isGoogleTokenActive } =
    useAuthCheck();
  const { hasCompletedSignup } = useHasCompletedSignup();

  useEffect(() => {
    const handleAuthCheck = () => {
      if (isAuthenticated === false) {
        // Wait for hasCompletedSignup to be determined (not null) before redirecting
        if (hasCompletedSignup === null) {
          return;
        }

        // Check if user has completed signup to determine redirect destination
        if (hasCompletedSignup === true) {
          // User has completed signup before, redirect to /login
          if (isGoogleTokenActive === false) {
            navigate(
              `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.GAUTH_SESSION_EXPIRED}`,
            );
          } else {
            navigate(
              `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`,
            );
          }
        } else {
          // User hasn't completed signup, redirect to /onboarding
          navigate(ROOT_ROUTES.ONBOARDING);
        }
      }
    };

    void handleAuthCheck();
  }, [isAuthenticated, isGoogleTokenActive, hasCompletedSignup, navigate]);

  return (
    <>
      {isCheckingAuth && <AbsoluteOverflowLoader />}
      {children}
    </>
  );
};
