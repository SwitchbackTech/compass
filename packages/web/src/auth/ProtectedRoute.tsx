import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { authenticated, loading } = useSession();
  const { hasCompletedSignup } = useHasCompletedSignup();

  useEffect(() => {
    const handleAuthCheck = () => {
      if (!authenticated) {
        // Wait for hasCompletedSignup to be determined (not null) before redirecting
        if (hasCompletedSignup === null) return;

        // Check if user has completed signup to determine redirect destination
        if (hasCompletedSignup) {
          // User has completed signup before, redirect to /login
          navigate(
            `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`,
          );
        } else {
          // User hasn't completed signup, redirect to /onboarding
          navigate(ROOT_ROUTES.ONBOARDING);
        }
      }
    };

    void handleAuthCheck();
  }, [authenticated, hasCompletedSignup, navigate]);

  return (
    <>
      {loading && <AbsoluteOverflowLoader />}
      {children}
    </>
  );
};
