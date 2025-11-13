import { ReactNode, useEffect } from "react";
import { useNavigate, useNavigation } from "react-router-dom";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSession } from "@web/common/hooks/useSession";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { state } = useNavigation();
  const { authenticated, loading } = useSession();

  useEffect(() => {
    if (authenticated || loading) return;

    navigate(
      `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`,
    );
  }, [authenticated, loading, navigate]);

  if (!authenticated) return null;

  if (state === "loading") return <AbsoluteOverflowLoader />;

  return <>{children}</>;
};
